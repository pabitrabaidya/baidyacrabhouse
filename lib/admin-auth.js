import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'bch_admin_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const failedLogins = new Map();

function getConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!password || password.length < 12 || !sessionSecret || sessionSecret.length < 32) {
    return null;
  }

  return { password, sessionSecret };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signExpiry(expiry, secret) {
  return createHmac('sha256', secret).update(`admin:${expiry}`).digest('hex');
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : '';
}

function getClientKey(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function getLoginLimit(key) {
  const now = Date.now();
  const record = failedLogins.get(key);

  if (!record || record.resetAt <= now) {
    return { allowed: true, remaining: MAX_FAILED_LOGINS };
  }

  return {
    allowed: record.count < MAX_FAILED_LOGINS,
    remaining: Math.max(0, MAX_FAILED_LOGINS - record.count),
    retryAfter: Math.ceil((record.resetAt - now) / 1000)
  };
}

function recordFailedLogin(key) {
  const now = Date.now();
  if (failedLogins.size >= 1000) {
    for (const [clientKey, record] of failedLogins) {
      if (record.resetAt <= now) failedLogins.delete(clientKey);
    }
    if (failedLogins.size >= 1000) failedLogins.clear();
  }
  const record = failedLogins.get(key);
  if (!record || record.resetAt <= now) {
    failedLogins.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  record.count += 1;
}

export function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

export function isSameOrigin(req) {
  const origin = req.headers.origin;
  const forwardedHost = req.headers['x-forwarded-host'];
  const requestHost = typeof forwardedHost === 'string'
    ? forwardedHost.split(',')[0].trim()
    : req.headers.host;

  if (!origin || !requestHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

export function adminConfigurationAvailable() {
  return Boolean(getConfig()) && (process.env.VERCEL !== '1' || Boolean(process.env.BLOB_READ_WRITE_TOKEN));
}

export function isAdminAuthenticated(req) {
  const config = getConfig();
  if (!config) return false;

  const token = getCookie(req, COOKIE_NAME);
  const separator = token.indexOf('.');
  if (separator <= 0) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(expiry) || Number(expiry) <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(signature, signExpiry(expiry, config.sessionSecret));
}

export function authenticateAdmin(req, res) {
  setNoStore(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ success: false, error: 'Request origin could not be verified.' });
    return false;
  }

  const config = getConfig();
  if (!config) {
    res.status(503).json({ success: false, error: 'Admin secrets are not configured on the server.' });
    return false;
  }

  const key = getClientKey(req);
  const limit = getLoginLimit(key);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    res.status(429).json({ success: false, error: 'Too many login attempts. Try again later.' });
    return false;
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEqual(password, config.password)) {
    recordFailedLogin(key);
    res.status(401).json({ success: false, error: 'Incorrect password.' });
    return false;
  }

  failedLogins.delete(key);
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS);
  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  const maxAge = req.body?.remember === false ? '' : `; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${expiry}.${signExpiry(expiry, config.sessionSecret)}; Path=/api; HttpOnly; SameSite=Strict${maxAge}${secure}`
  );
  return true;
}

export function clearAdminSession(res) {
  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secure}`
  );
}
