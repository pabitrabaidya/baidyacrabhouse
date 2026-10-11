import {
  adminConfigurationAvailable,
  authenticateAdmin,
  clearAdminSession,
  isAdminAuthenticated,
  isSameOrigin,
  setNoStore
} from '../lib/admin-auth.js';

export default function handler(req, res) {
  setNoStore(res);

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: adminConfigurationAvailable(),
      authenticated: isAdminAuthenticated(req)
    });
  }

  if (req.method === 'POST') {
    if (!authenticateAdmin(req, res)) return;
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    if (!isSameOrigin(req)) {
      return res.status(403).json({ success: false, error: 'Request origin could not be verified.' });
    }
    clearAdminSession(res);
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
