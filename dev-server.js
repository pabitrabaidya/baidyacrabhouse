import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import reviewsHandler from './api/reviews.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Body parser for JSON
app.use(express.json());

// API route for reviews
app.all('/api/reviews', reviewsHandler);

// Serve static files (HTML, CSS, JS, images, JSON, etc.)
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Route fallback for /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route fallback for /bn
app.get('/bn', (req, res) => {
  res.sendFile(path.join(__dirname, 'bn', 'index.html'));
});

// Start local development server
app.listen(Number(PORT), HOST, () => {
  console.log(`Baidya Crab House local dev server running on http://${HOST}:${PORT}`);
});
