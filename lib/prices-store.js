import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put } from '@vercel/blob';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const localPricesPath = path.join(publicDirectory, 'prices.json');
const BLOB_PATHNAME = 'prices.json';
const MAX_PRICE = 1_000_000;

export class PriceValidationError extends Error {}

function readLocalPrices() {
  return JSON.parse(fs.readFileSync(localPricesPath, 'utf8'));
}

function validatePriceData(data) {
  if (!data || data.currency !== 'INR' || !Array.isArray(data.products) || data.products.length === 0) {
    throw new Error('Price data has an invalid structure.');
  }
  return data;
}

function normalizeGreenCrabProduct(data) {
  const legacyProducts = data.products.filter(product =>
    product && (product.id === 'green_crab' || (typeof product.id === 'string' && /^gc[1-4]$/.test(product.id)))
  );
  if (!legacyProducts.length) return data;

  const firstIndex = data.products.findIndex(product => legacyProducts.includes(product));
  const existingGreenCrab = legacyProducts.find(product => product.id === 'green_crab');
  const hasGreenCrabGradeSet = existingGreenCrab
    && ['GC1', 'GC2', 'GC3', 'GC4'].every(grade => Object.hasOwn(existingGreenCrab.grades || {}, grade));
  const grades = hasGreenCrabGradeSet
    ? existingGreenCrab.grades
    : { GC1: null, GC2: null, GC3: null, GC4: null };
  const greenCrab = {
    ...existingGreenCrab,
    id: 'green_crab',
    name: 'Green Crab',
    name_bn: 'সবুজ কাঁকড়া',
    price: hasGreenCrabGradeSet ? existingGreenCrab.price : null,
    starting_price: hasGreenCrabGradeSet ? existingGreenCrab.starting_price : null,
    price_range: hasGreenCrabGradeSet ? existingGreenCrab.price_range : '',
    grades
  };
  const products = data.products.filter(product => !legacyProducts.includes(product));
  products.splice(Math.min(firstIndex, products.length), 0, greenCrab);
  return { ...data, products };
}

export async function getPrices() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && process.env.VERCEL === '1') {
    return normalizeGreenCrabProduct(validatePriceData(readLocalPrices()));
  }

  if (token) {
    const blob = await get(BLOB_PATHNAME, { access: 'public', token, useCache: false });
    if (blob) {
      return normalizeGreenCrabProduct(validatePriceData(await new Response(blob.stream).json()));
    }
  }

  return normalizeGreenCrabProduct(validatePriceData(readLocalPrices()));
}

function validateUpdates(current, submittedProducts) {
  if (!Array.isArray(submittedProducts) || submittedProducts.length !== current.products.length) {
    throw new PriceValidationError('The submitted product list is incomplete.');
  }

  const submittedById = new Map();
  for (const submitted of submittedProducts) {
    if (!submitted || typeof submitted.id !== 'string' || submittedById.has(submitted.id)) {
      throw new PriceValidationError('The submitted product list contains an invalid product.');
    }
    submittedById.set(submitted.id, submitted);
  }

  return current.products.map(product => {
    const submitted = submittedById.get(product.id);
    if (!submitted || typeof submitted.in_stock !== 'boolean') {
      throw new PriceValidationError(`Invalid stock setting for ${product.id}.`);
    }

    const expectedGrades = Object.keys(product.grades || {});
    const grades = submitted.grades;
    if (
      !grades ||
      typeof grades !== 'object' ||
      Array.isArray(grades) ||
      Object.keys(grades).length !== expectedGrades.length ||
      expectedGrades.some(grade => !Object.hasOwn(grades, grade))
    ) {
      throw new PriceValidationError(`Invalid grade list for ${product.id}.`);
    }

    const normalizedGrades = {};
    for (const grade of expectedGrades) {
      const price = grades[grade];
      if (price === null && product.id === 'green_crab') {
        normalizedGrades[grade] = null;
        continue;
      }
      if (!Number.isInteger(price) || price < 1 || price > MAX_PRICE) {
        throw new PriceValidationError(`Enter a whole-number price from ₹1 to ₹${MAX_PRICE.toLocaleString('en-IN')} for ${product.id} (${grade}).`);
      }
      normalizedGrades[grade] = price;
    }

    const sortedPrices = Object.values(normalizedGrades).filter(price => price !== null).sort((left, right) => left - right);
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });

    return {
      ...product,
      price: sortedPrices[0] ?? null,
      starting_price: sortedPrices[0] ?? null,
      price_range: sortedPrices.length
        ? `${formatter.format(sortedPrices[0])} – ${formatter.format(sortedPrices[sortedPrices.length - 1])}`
        : '',
      in_stock: submitted.in_stock,
      grades: normalizedGrades
    };
  });
}

export async function savePrices(submittedProducts, lastUpdated) {
  const current = await getPrices();
  const updatedDate = lastUpdated ?? new Date().toISOString().slice(0, 10);
  if (
    typeof updatedDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(updatedDate)
    || new Date(`${updatedDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== updatedDate
  ) {
    throw new PriceValidationError('Enter a valid price verification date.');
  }
  const updated = {
    ...current,
    last_updated: updatedDate,
    currency: 'INR',
    products: validateUpdates(current, submittedProducts)
  };
  const serialized = `${JSON.stringify(updated, null, 2)}\n`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    await put(BLOB_PATHNAME, serialized, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
      token
    });
  } else if (process.env.VERCEL === '1') {
    const error = new Error('Price storage is not configured on the server.');
    error.statusCode = 503;
    throw error;
  } else {
    const temporaryPath = path.join(publicDirectory, `.prices-${process.pid}.tmp`);
    fs.writeFileSync(temporaryPath, serialized, 'utf8');
    fs.renameSync(temporaryPath, localPricesPath);
  }

  return updated;
}
