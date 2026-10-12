import { getReviews } from '../lib/reviews-store.js';
import { setNoStore } from '../lib/admin-auth.js';

export default async function handler(req, res) {
  setNoStore(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const reviews = await getReviews();
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(reviews);
  } catch (error) {
    console.error('Failed to load customer reviews:', error);
    return res.status(500).json({ success: false, error: 'Unable to load customer reviews.' });
  }
}
