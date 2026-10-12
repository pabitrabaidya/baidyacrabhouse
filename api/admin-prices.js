import { isAdminAuthenticated, isSameOrigin, setNoStore } from '../lib/admin-auth.js';
import { getPrices, PriceValidationError, savePrices } from '../lib/prices-store.js';

export default async function handler(req, res) {
  setNoStore(res);

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ success: false, error: 'Please sign in to manage prices.' });
  }

  if (req.method === 'GET') {
    try {
      return res.status(200).json(await getPrices());
    } catch (error) {
      console.error('Admin failed to load prices:', error);
      return res.status(500).json({ success: false, error: 'Unable to load prices.' });
    }
  }

  if (req.method === 'PUT') {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, error: 'Request origin could not be verified.' });
    }

    try {
      const prices = await savePrices(req.body?.products, req.body?.last_updated);
      return res.status(200).json({ success: true, prices });
    } catch (error) {
      if (error.statusCode === 503) {
        return res.status(503).json({ success: false, error: error.message });
      }
      if (error instanceof PriceValidationError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('Admin failed to save prices:', error);
      return res.status(500).json({ success: false, error: 'Unable to save prices.' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
