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

## Price & Inventory Admin

Open `/admin` to update product grade prices and availability. The admin API validates all changes server-side.

### Vercel setup

1. In the [Vercel dashboard](https://vercel.com/dashboard), open this project and select **Storage**.
2. Choose **Create Database** (or **Connect Store** if shown), select **Blob**, and create a store. Set its access to **Public**; the app reads the price file using public Blob access.
3. Connect the new store to this Vercel project and select the environments where the admin should work, at least **Production**. Vercel should add `BLOB_READ_WRITE_TOKEN` to the project automatically. If it does not, copy the store's read/write token and add it under **Settings → Environment Variables** with that exact name. Keep the token private.
4. Under **Settings → Environment Variables**, add `ADMIN_PASSWORD` (at least 12 characters) and `ADMIN_SESSION_SECRET` (at least 32 random characters). Generate a session secret with:
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Keep both secrets private.
5. Redeploy the project so the new environment variables are available. Updates made at `/admin` are saved to Blob storage and served to both English and Bengali product pages.

The store itself starts empty; you do not need to upload a file manually. If `prices.json` is not in Blob yet, the prices endpoint uses the checked-in `public/prices.json` as initial data. The first successful admin save creates or updates the `prices.json` Blob object. Because this is a public store, only put public price and inventory data in it—never credentials or customer information.

For local development, set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` before starting the server. Admin updates are written to `public/prices.json`; Vercel Blob is used only when `BLOB_READ_WRITE_TOKEN` is configured.

---

## 📁 Architecture on Vercel

- **Edge CDN Static Assets**: High-speed global edge serving for `index.html`, `products.html`, `about.html`, `contact.html`, `bn/` (Bengali language pages), `style.css`, `scripts.js`, and `images/`.
- **Serverless API Routes**: `api/reviews.js` handles customer reviews; `api/prices.js` serves current prices; protected `api/admin-session.js` and `api/admin-prices.js` handle admin sign-in and price updates.
- **Persistent Price Storage**: Product price and inventory changes are stored in Vercel Blob and served to both storefront language versions.
- **Clean URLs**: Configured via `vercel.json` (`cleanUrls: true`) so pages can be accessed cleanly without `.html` extensions.
- **Security & Caching Headers**: Includes headers for strict security (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) and performance caching.
