import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import reviewsHandler from './api/reviews.js';
import pricesHandler from './api/prices.js';
import adminSessionHandler from './api/admin-session.js';
import adminPricesHandler from './api/admin-prices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '32kb' }));

// API routes
app.all('/api/reviews', reviewsHandler);
app.all('/api/prices', pricesHandler);
app.all('/api/admin/session', adminSessionHandler);
app.all('/api/admin/prices', adminPricesHandler);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve static assets from public/ locally
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Route fallback for /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route fallback for /bn
app.get('/bn', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bn', 'index.html'));
});

// Start local development server when run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  app.listen(Number(PORT), HOST, () => {
    console.log(`Baidya Crab House server running on http://${HOST}:${PORT}`);
  });
}

export default app;
