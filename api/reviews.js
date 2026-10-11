import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let reviewsData = null;

// Determine candidate file paths for reviews.json
function getCandidatePaths() {
  const candidates = [];
  // 1. /tmp/reviews.json (persistent across warm lambda invocations in serverless)
  candidates.push(path.join('/tmp', 'reviews.json'));
  // 2. process.cwd() / reviews.json (project root in Vercel environment)
  candidates.push(path.join(process.cwd(), 'reviews.json'));
  // 3. Relative to this file
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.join(currentDir, '..', 'reviews.json'));
    candidates.push(path.join(currentDir, 'reviews.json'));
  } catch (e) {}
  return candidates;
}

function loadReviews() {
  const candidates = getCandidatePaths();
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reviews)) {
          reviewsData = parsed;
          return;
        }
      }
    } catch (err) {
      // Continue to next candidate path
    }
  }

  if (!reviewsData || !Array.isArray(reviewsData.reviews)) {
    reviewsData = { average_rating: 4.9, total_reviews: 48, reviews: [] };
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!reviewsData) {
    loadReviews();
  }

  // GET / HEAD: Fetch reviews
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (req.method === 'HEAD') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).end();
    }
    const query = req.query || {};
    const sort = query.sort;
    const category = query.category;
    const limit = query.limit;

    let list = [...(reviewsData.reviews || [])];

    // Filter by category if requested
    if (category && category !== 'all') {
      list = list.filter(r => r.category === category);
    }

    // Sorting
    if (sort === 'newest') {
      list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } else if (sort === 'highest') {
      list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
    } else if (sort === 'interchange' || sort === 'shuffle') {
      // Fisher-Yates shuffle to interchange review order
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    const max = limit ? parseInt(limit, 10) : list.length;
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).json({
      success: true,
      average_rating: reviewsData.average_rating || 4.9,
      total_reviews: reviewsData.total_reviews || list.length,
      last_synced: new Date().toISOString(),
      count: list.length,
      reviews: list.slice(0, max)
    });
  }

  // POST: Submit a new review
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    const { author, location, rating, quote, order_tag, category } = body || {};

    if (!author || !quote) {
      return res.status(400).json({
        success: false,
        error: 'Author name and review text are required.'
      });
    }

    const initials =
      author.trim().split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'KH';

    const newReview = {
      id: 'rev-' + Date.now(),
      author: author.trim(),
      author_bn: author.trim(),
      initials,
      location: location ? location.trim() : 'Kolkata Customer',
      location_bn: location ? location.trim() : 'কলকাতা ক্রেতা',
      rating: Number(rating) || 5,
      date: new Date().toISOString(),
      date_display: 'Just now',
      date_display_bn: 'এইমাত্র',
      order_tag: order_tag || 'Fresh Sundarban Crabs',
      order_tag_bn: order_tag || 'তাজা সুন্দরবনের কাঁকড়া',
      category: category || 'general',
      quote: quote.trim(),
      quote_bn: quote.trim(),
      verified: true,
      color: 'teal',
      is_new: true
    };

    reviewsData.reviews.unshift(newReview);
    reviewsData.total_reviews = (reviewsData.total_reviews || 48) + 1;

    // Persist to /tmp (serverless) and process.cwd() (local disk) if writable
    try {
      const serialized = JSON.stringify(reviewsData, null, 2);
      try {
        fs.writeFileSync(path.join('/tmp', 'reviews.json'), serialized);
      } catch (err) {}
      try {
        fs.writeFileSync(path.join(process.cwd(), 'reviews.json'), serialized);
      } catch (err) {}
    } catch (e) {
      console.error('Failed to persist review:', e);
    }

    return res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review: newReview,
      total_reviews: reviewsData.total_reviews
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
