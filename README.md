# Baidya Crab House 🦀

> Online delivery platform for live and fresh Sundarban mud crabs in Kolkata with 100% Ghilu guarantee.

## 🚀 Vercel Deployment

This project is configured and ready for zero-friction deployment on [Vercel](https://vercel.com).

### Option 1: Deploy with Vercel CLI (Quickest)

1. Run the Vercel deploy command in your terminal:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts (defaults are already configured via `vercel.json`).
3. To deploy directly to production:
   ```bash
   npx vercel --prod
   ```

### Option 2: Deploy via GitHub / Vercel Dashboard

1. Initialize git and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit ready for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Keep default settings (Framework Preset: **Other**, Root Directory: `./`).
4. Click **Deploy**.

---

## 🛠️ Local Development

To run the local Express server:

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
# or
npm start
```

The application will be running at [http://localhost:3000](http://localhost:3000).

---

## 📁 Architecture on Vercel

- **Edge CDN Static Assets**: High-speed global edge serving for `index.html`, `products.html`, `about.html`, `contact.html`, `bn/` (Bengali language pages), `style.css`, `scripts.js`, and `images/`.
- **Serverless API Routes (`/api/reviews`)**: Handled by `api/reviews.js` on Vercel Serverless Functions with support for sorting, filtering, and instant customer review submission.
- **Clean URLs**: Configured via `vercel.json` (`cleanUrls: true`) so pages can be accessed cleanly without `.html` extensions.
- **Security & Caching Headers**: Includes headers for strict security (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) and performance caching.
