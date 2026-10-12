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

## Customer Reviews

The English and Bengali home pages display the manually maintained reviews in `public/reviews.json`; reviews are not fetched from Google. The storefront shows at most two rows of reviews and rotates through additional entries every seven seconds; rotation pauses while a visitor hovers over or focuses the cards, and can be paused with the control beside the reviews. Sign in at `/admin` and open **Customer Reviews** to add, edit, or delete entries. The storefront rating and review count are calculated from the saved reviews. English review fields are required; Bengali name, text, and time, location, and order tag are optional. The **Live Rates & Stock** tab supports per-product and bulk price shifts, stock toggles, and an editable price verification date.

On Vercel, review changes are stored in the same public Blob store as prices. The public reviews endpoint reads the saved review list so storefront updates appear after saving. Locally, admin changes update `public/reviews.json`.

## Price & Inventory Admin

Open `/admin` to update product grade prices and availability. The admin API validates all changes server-side.

### Vercel setup

1. In the [Vercel dashboard](https://vercel.com/dashboard), open this project and select **Storage**.
2. Choose **Create Database** (or **Connect Store** if shown), select **Blob**, and create a store. Set its access to **Public**; the app reads the price and review files using public Blob access.
3. Connect the new store to this Vercel project and select the environments where the admin should work, at least **Production**. Vercel should add `BLOB_READ_WRITE_TOKEN` to the project automatically. If it does not, copy the store's read/write token and add it under **Settings → Environment Variables** with that exact name. Keep the token private.
4. Under **Settings → Environment Variables**, add `ADMIN_PASSWORD` (at least 12 characters) and `ADMIN_SESSION_SECRET` (at least 32 random characters). Generate a session secret with:
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
   Keep both secrets private.
5. Redeploy the project so the new environment variables are available. Updates made at `/admin` are saved to Blob storage and served to both English and Bengali product pages.

The store itself starts empty; you do not need to upload a file manually. If `prices.json` or `reviews.json` is not in Blob yet, the respective endpoint uses the checked-in file under `public/` as initial data. The first successful admin save creates or updates that Blob object. Because this is a public store, only put public price, inventory, and review data in it—never credentials or private customer information.

For local development, set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` before starting the server. Admin updates are written to `public/prices.json` and `public/reviews.json`; Vercel Blob is used when `BLOB_READ_WRITE_TOKEN` is configured.

---

## 📁 Architecture on Vercel

- **Edge CDN Static Assets**: High-speed global edge serving for `index.html`, `products.html`, `about.html`, `contact.html`, `bn/` (Bengali language pages), `style.css`, `scripts.js`, and `images/`.
- **Serverless API Routes**: `api/prices.js` and `api/reviews.js` serve current storefront data; protected `api/admin-session.js`, `api/admin-prices.js`, and `api/admin-reviews.js` handle admin sign-in and updates.
- **Persistent Store Data**: Product price, inventory, and customer review changes are stored in Vercel Blob and served to both storefront language versions.
- **Clean URLs**: Configured via `vercel.json` (`cleanUrls: true`) so pages can be accessed cleanly without `.html` extensions.
- **Security & Caching Headers**: Includes headers for strict security (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) and performance caching.
