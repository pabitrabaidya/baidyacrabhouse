const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVIEWS_URL = 'https://mybusiness.googleapis.com/v4';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedResponse;
let cacheExpiresAt = 0;

function getConfiguration() {
  const config = {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    accountId: process.env.GOOGLE_BUSINESS_ACCOUNT_ID,
    locationId: process.env.GOOGLE_BUSINESS_LOCATION_ID
  };

  if (Object.values(config).some(value => !value)) {
    const error = new Error('Google Business Profile reviews are not configured.');
    error.statusCode = 503;
    throw error;
  }

  return config;
}

async function readJsonResponse(response, serviceName) {
  if (!response.ok) {
    const error = new Error(`${serviceName} returned HTTP ${response.status}.`);
    error.statusCode = 502;
    throw error;
  }
  return response.json();
}

async function getAccessToken(config, fetchImpl) {
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(8000)
  });
  const tokenData = await readJsonResponse(response, 'Google OAuth');

  if (typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
    const error = new Error('Google OAuth did not return an access token.');
    error.statusCode = 502;
    throw error;
  }

  return tokenData.access_token;
}

function getResourceId(value, prefix) {
  const id = value.startsWith(`${prefix}/`) ? value.slice(prefix.length + 1) : value;
  return `${prefix}/${encodeURIComponent(id)}`;
}

async function fetchAllReviews(config, fetchImpl) {
  const accessToken = await getAccessToken(config, fetchImpl);
  const accountPath = getResourceId(config.accountId, 'accounts');
  const locationPath = getResourceId(config.locationId, 'locations');
  const reviews = [];
  const seenPageTokens = new Set();
  let nextPageToken;
  let responseData;
  let summaryData;

  do {
    const url = new URL(
      `${GOOGLE_REVIEWS_URL}/${accountPath}/${locationPath}/reviews`
    );
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'updateTime desc');
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000)
    });
    responseData = await readJsonResponse(response, 'Google Business Profile');
    summaryData ??= responseData;

    if (Array.isArray(responseData.reviews)) {
      reviews.push(...responseData.reviews);
    }

    nextPageToken = responseData.nextPageToken;
    if (nextPageToken && seenPageTokens.has(nextPageToken)) {
      throw new Error('Google Business Profile returned a repeated page token.');
    }
    if (nextPageToken) seenPageTokens.add(nextPageToken);
  } while (nextPageToken);

  return {
    averageRating: summaryData.averageRating ?? null,
    totalReviewCount: summaryData.totalReviewCount ?? reviews.length,
    reviews: reviews.map(review => {
      const createTime = typeof review.createTime === 'string' ? review.createTime : '';
      return {
        reviewId: typeof review.reviewId === 'string' ? review.reviewId : '',
        reviewerName: typeof review.reviewer?.displayName === 'string' ? review.reviewer.displayName : '',
        comment: typeof review.comment === 'string' ? review.comment : '',
        starRating: typeof review.starRating === 'string' ? review.starRating : '',
        createTime,
        updateTime: typeof review.updateTime === 'string' ? review.updateTime : createTime
      };
    })
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  if (req.method === 'HEAD') return res.status(200).end();

  try {
    if (cachedResponse && Date.now() < cacheExpiresAt) {
      return res.status(200).json(cachedResponse);
    }

    const data = await fetchAllReviews(getConfiguration(), globalThis.fetch);
    cachedResponse = data;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return res.status(200).json(data);
  } catch (error) {
    console.error('Failed to load Google Business Profile reviews:', error);
    res.setHeader('Cache-Control', 'no-store');
    const statusCode = error.statusCode || 502;
    const message = statusCode === 503
      ? 'Google reviews are not configured yet.'
      : 'Unable to load Google reviews right now.';
    return res.status(statusCode).json({ success: false, error: message });
  }
}
