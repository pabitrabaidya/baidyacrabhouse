import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, put } from '@vercel/blob';

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const localReviewsPath = path.join(publicDirectory, 'reviews.json');
const BLOB_PATHNAME = 'reviews.json';
const MAX_REVIEWS = 100;
const MAX_FIELD_LENGTHS = {
  name: 100,
  text: 2000,
  time: 100,
  location: 150,
  order_tag: 120,
  name_bn: 100,
  text_bn: 2000,
  time_bn: 100,
  category: 50
};
const OPTIONAL_STRING_FIELDS = Object.keys(MAX_FIELD_LENGTHS).filter(field =>
  !['name', 'text', 'time'].includes(field)
);
const REVIEW_COLORS = new Set(['teal', 'coral', 'navy', 'green']);

export class ReviewValidationError extends Error {}

function readLocalReviews() {
  return JSON.parse(fs.readFileSync(localReviewsPath, 'utf8'));
}

export function validateReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length > MAX_REVIEWS) {
    throw new ReviewValidationError(`Reviews must be an array of no more than ${MAX_REVIEWS} entries.`);
  }

  const ids = new Set();
  return reviews.map(review => {
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      throw new ReviewValidationError('Each review must be an object.');
    }
    if (!Number.isSafeInteger(review.id) || review.id < 1 || ids.has(review.id)) {
      throw new ReviewValidationError('Review IDs must be unique positive integers.');
    }
    ids.add(review.id);
    if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
      throw new ReviewValidationError(`Review ${review.id} must have a rating from 1 to 5.`);
    }

    const normalized = { id: review.id, rating: review.rating };
    for (const field of ['name', 'text', 'time']) {
      if (typeof review[field] !== 'string' || !review[field].trim()) {
        throw new ReviewValidationError(`Review ${review.id} must include ${field}.`);
      }
      if (review[field].trim().length > MAX_FIELD_LENGTHS[field]) {
        throw new ReviewValidationError(`Review ${review.id} has a ${field} that is too long.`);
      }
      normalized[field] = review[field].trim();
    }

    for (const field of OPTIONAL_STRING_FIELDS) {
      if (review[field] === undefined || review[field] === null || review[field] === '') continue;
      if (typeof review[field] !== 'string' || review[field].trim().length > MAX_FIELD_LENGTHS[field]) {
        throw new ReviewValidationError(`Review ${review.id} has an invalid ${field}.`);
      }
      normalized[field] = review[field].trim();
    }

    if (review.verified !== undefined) {
      if (typeof review.verified !== 'boolean') {
        throw new ReviewValidationError(`Review ${review.id} has an invalid verified flag.`);
      }
      normalized.verified = review.verified;
    }
    if (review.is_new !== undefined) {
      if (typeof review.is_new !== 'boolean') {
        throw new ReviewValidationError(`Review ${review.id} has an invalid new flag.`);
      }
      normalized.is_new = review.is_new;
    }
    if (review.color !== undefined) {
      if (typeof review.color !== 'string' || !REVIEW_COLORS.has(review.color)) {
        throw new ReviewValidationError(`Review ${review.id} has an invalid color.`);
      }
      normalized.color = review.color;
    }

    return normalized;
  });
}

export async function getReviews() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const blob = await get(BLOB_PATHNAME, { access: 'public', token, useCache: false });
    if (blob) return validateReviews(await new Response(blob.stream).json());
  }

  return validateReviews(readLocalReviews());
}

export async function saveReviews(reviews) {
  const normalized = validateReviews(reviews);
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
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
    const error = new Error('Review storage is not configured on the server.');
    error.statusCode = 503;
    throw error;
  } else {
    const temporaryPath = path.join(publicDirectory, `.reviews-${process.pid}.tmp`);
    fs.writeFileSync(temporaryPath, serialized, 'utf8');
    fs.renameSync(temporaryPath, localReviewsPath);
  }

  return normalized;
}
