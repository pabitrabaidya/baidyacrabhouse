import { isAdminAuthenticated, isSameOrigin, setNoStore } from '../lib/admin-auth.js';
import { getReviews, ReviewValidationError, saveReviews } from '../lib/reviews-store.js';

export default async function handler(req, res) {
  setNoStore(res);

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ success: false, error: 'Please sign in to manage reviews.' });
  }

  if (req.method === 'GET') {
    try {
      return res.status(200).json({ reviews: await getReviews() });
    } catch (error) {
      console.error('Admin failed to load reviews:', error);
      return res.status(500).json({ success: false, error: 'Unable to load reviews.' });
    }
  }

  if (req.method === 'PUT') {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, error: 'Request origin could not be verified.' });
    }

    try {
      const reviews = await saveReviews(req.body?.reviews);
      return res.status(200).json({ success: true, reviews });
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ success: false, error: error.message });
      }
      if (error instanceof ReviewValidationError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('Admin failed to save reviews:', error);
      return res.status(500).json({ success: false, error: 'Unable to save reviews.' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
