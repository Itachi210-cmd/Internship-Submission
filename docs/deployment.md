# ShopNest Production Deployment Guide (Free-Tier Stack)

This guide documents the complete end-to-end procedure for deploying **ShopNest** using free-tier cloud infrastructure:
- **Frontend:** Vercel (or Netlify)
- **Backend:** Render (Free Web Service)
- **Database:** MongoDB Atlas (M0 Free Tier)
- **Cache & Sessions:** Upstash Redis (Serverless Free Tier with TLS)
- **File Storage:** Supabase Storage (S3-Compatible API)
- **Search Engine:** MongoDB Text & Regex Fallback (or Optional Elastic Cloud)

---

## 1. Cloud Architecture Overview

```mermaid
flowchart TD
    Client["Browser / Client"]
    Vercel["Frontend on Vercel<br/>(SPA + /api Proxy Rewrite)"]
    Render["Backend on Render<br/>(Express API + Trust Proxy)"]
    Atlas[("MongoDB Atlas M0<br/>(Primary Store)")]
    Upstash[("Upstash Redis<br/>(rediss:// TLS)")]
    Supabase[("Supabase Storage<br/>(S3-Compatible API)")]
    ElasticCloud[("Elastic Cloud<br/>(Optional Search)")]

    Client -->|"HTTPS UI & /api/*"| Vercel
    Vercel -->|"/api/* Proxy Rewrite"| Render
    Render -->|"Mongoose TLS"| Atlas
    Render -->|"ioredis TLS"| Upstash
    Render -->|"S3 Presigned URLs"| Supabase
    Render -.->|"Optional REST"| ElasticCloud
```

---

## 2. Step 1: MongoDB Atlas Setup (M0 Free Tier)

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster and select **M0 Sandbox (Free)** in your preferred AWS/GCP region.
3. **Database Access:**
   - Navigate to **Security → Database Access**.
   - Click **Add New Database User**.
   - Create a user (e.g. `shopnest_admin`) with **Built-in Role: Read and write to any database**.
   - Save the password securely.
4. **Network Access (Critical for Render):**
   - Navigate to **Security → Network Access**.
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Why:* Render free web services use dynamic outbound IP addresses with no fixed egress IP. Without `0.0.0.0/0`, connections from Render will be blocked with `MongooseServerSelectionError`.
5. **Get Connection String:**
   - Click **Database → Connect → Drivers (Node.js)**.
   - Copy the connection string. Append `/marketplace?retryWrites=true&w=majority` to set the database name:
     ```
     mongodb+srv://shopnest_admin:<PASSWORD>@cluster0.xxxxx.mongodb.net/marketplace?retryWrites=true&w=majority
     ```

---

## 3. Step 2: Upstash Redis Setup (Serverless TLS)

1. Sign in to [Upstash Console](https://console.upstash.com/).
2. Click **Create Database**.
   - **Name:** `shopnest-redis`
   - **Type:** Regional (Free Tier)
   - **Region:** Same or closest region to your MongoDB Atlas cluster.
   - **TLS (SSL):** Enabled (default).
3. **Get Connection String:**
   - Under database details, locate **Node.js (ioredis)** connection settings.
   - Copy the `rediss://` URL format:
     ```
     rediss://default:<UPSTASH_PASSWORD>@<ENDPOINT>.upstash.io:6379
     ```
   - Notice the double `s` in `rediss://`, which instructs `ioredis` to establish a secure TLS socket.

---

## 4. Step 3: Supabase Storage Setup (S3-Compatible API)

1. Sign in to [Supabase](https://supabase.com/) and create a project (e.g. `shopnest-storage`).
2. **Create Storage Bucket:**
   - Navigate to **Storage → Buckets**.
   - Click **New Bucket**.
   - **Name:** `marketplace-images`
   - Toggle **Public bucket: ON** (so product thumbnails and vendor logos are publicly readable via browser).
   - Click **Save**.
3. **Retrieve S3-Compatible Credentials:**
   - Navigate to **Project Settings → Storage**.
   - Under **S3 Access Keys**, generate a new Access Key / Secret Key pair.
   - Note down:
     - **Endpoint:** `https://<PROJECT_REF>.supabase.co/storage/v1/s3`
     - **Region:** Your Supabase project region (e.g. `ap-south-1` or `us-east-1`)
     - **Access Key ID:** `<KEY_ID>`
     - **Secret Access Key:** `<SECRET_KEY>`
     - **Public Base URL:** `https://<PROJECT_REF>.supabase.co/storage/v1/object/public/marketplace-images`

---

## 5. Step 4: Render Web Service Setup (Backend)

You can deploy either using the included [`render.yaml`](../render.yaml) blueprint or manually through the Render Dashboard:

### Option A: Using Render Blueprint (`render.yaml`)
1. In Render Dashboard, click **New → Blueprint**.
2. Connect this repository. Render automatically reads `render.yaml` and preconfigures the service name, root directory, build command, and start command.
3. Fill in the prompted environment variable values.

### Option B: Manual Web Service Creation
1. Click **New → Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name:** `shopnest-backend`
   - **Region:** Oregon (USA) or Frankfurt (EU)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/health/live` (Liveness probe for Render zero-downtime deployment)

### Environment Variables on Render
Add each of the following under the **Environment** tab:

| Variable Name | Example Value / Format | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & security validation |
| `PORT` | `10000` | Render assigns 10000 automatically |
| `CLIENT_URL` | `https://shopnest.vercel.app` | Allowed CORS frontend origins (comma-separated if multiple) |
| `BACKEND_PUBLIC_URL` | `https://shopnest-backend.onrender.com` | Public URL used for webhook callbacks |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/marketplace?retryWrites=true&w=majority` | Atlas connection string |
| `REDIS_URL` | `rediss://default:pass@endpoint.upstash.io:6379` | Upstash TLS Redis URL |
| `JWT_ACCESS_SECRET` | *(64+ random hex characters)* | Access token signing secret |
| `JWT_REFRESH_SECRET` | *(64+ random hex characters)* | Refresh token signing secret |
| `COOKIE_SAMESITE` | `lax` | Set to `lax` with Vercel `/api` proxy (or `none` if direct cross-site) |
| `COOKIE_SECURE` | `true` | Requires HTTPS for refresh token cookie |
| `PAYMENT_PROVIDER` | `mock` | Built-in sandbox gateway provider |
| `MOCK_GATEWAY_SECRET` | *(32+ random hex characters)* | HMAC signature secret for payment gateway |
| `MOCK_WEBHOOK_SECRET` | *(32+ random hex characters)* | HMAC signature secret for webhook callbacks |
| `MOCK_WEBHOOK_ENABLED` | `true` | Enables auto-processing of webhook payouts |
| `ENABLE_FAKE_PAY` | `false` | Must remain `false` in production |
| `AWS_REGION` | `ap-south-1` | Supabase / AWS region |
| `AWS_BUCKET` | `marketplace-images` | Storage bucket name |
| `AWS_ACCESS_KEY_ID` | *(your Supabase access key ID)* | S3 client access key |
| `AWS_SECRET_ACCESS_KEY` | *(your Supabase secret key)* | S3 client secret key |
| `S3_ENDPOINT` | `https://<PROJECT_REF>.supabase.co/storage/v1/s3` | Supabase S3 API endpoint |
| `S3_FORCE_PATH_STYLE` | `true` | Required for Supabase S3 compatibility |
| `S3_PUBLIC_URL` | `https://<PROJECT_REF>.supabase.co/storage/v1/object/public/marketplace-images` | Public asset URL |
| `ES_NODE` | *(leave empty if using MongoDB fallback)* | Cloud Elasticsearch URL (optional) |
| `ES_API_KEY` | *(leave empty if unconfigured)* | Elastic Cloud API Key (optional) |
| `ES_INDEX` | `products` | Product index name |
| `ADMIN_EMAIL` | `admin@shopnest.local` | Email for initial administrator account |
| `ADMIN_PASSWORD` | *(strong password)* | Password for initial administrator account |

> [!TIP]
> Generate secure random tokens for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MOCK_GATEWAY_SECRET`, and `MOCK_WEBHOOK_SECRET` with Node.js:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 6. Step 5: Vercel Frontend Setup

1. Sign in to [Vercel](https://vercel.com/) and click **Add New → Project**.
2. Import your Git repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and choose `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Configure `vercel.json` with your Render backend URL:**
   - In [`frontend/vercel.json`](../frontend/vercel.json), replace `https://YOUR-BACKEND.onrender.com` with your live Render URL:
     ```json
     {
       "rewrites": [
         {
           "source": "/api/(.*)",
           "destination": "https://shopnest-backend.onrender.com/api/$1"
         },
         {
           "source": "/(.*)",
           "destination": "/index.html"
         }
       ]
     }
     ```
5. **Environment Variables in Vercel:**
   - `VITE_API_URL`: `/api` (uses Vercel proxy rewrite to keep cookies first-party).
   - `VITE_BACKEND_URL`: `https://shopnest-backend.onrender.com` (used strictly for the fire-and-forget warm-up ping on initial load).
6. Click **Deploy**.

---

## 7. Step 6: Initial Administrator Account Seed

Once MongoDB Atlas and Render are connected:

### Method A: Run seed from your local terminal against Atlas
Set your remote `MONGO_URI` in `backend/.env` (or pass it via shell) and run:
```bash
cd backend
npm run seed:production
```
The script is **completely idempotent**:
- If the administrator does not exist, it creates the administrator account with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- If the administrator account already exists, it verifies the role and exits safely without modifying or overwriting credentials.

### Method B: Run seed via Render Shell
1. In the Render Dashboard, open your `shopnest-backend` service.
2. Click **Shell** in the left navigation.
3. Run:
   ```bash
   npm run seed:production
   ```

---

## 8. Step 7: Optional Demo Data Seed from Laptop

If you wish to populate demo vendors (Aura Tech Hub, Velvet & Thread) and catalog products from your local machine to your Atlas instance:

```bash
cd backend
# 1. Point MONGO_URI to your Atlas cluster in .env
# 2. Allow demo seed flag
ALLOW_DEMO_SEED=true npm run seed:demo -- --yes
```
> [!NOTE]
> The `--yes` flag is mandatory whenever `MONGO_URI` points to a non-localhost host to prevent accidental overwriting of remote databases.

---

## 9. Step 8: Optional Elastic Cloud Setup

Elasticsearch is **100% optional**. If `ES_NODE` is left empty, ShopNest automatically uses MongoDB regex and text indexes for catalog searches and autocomplete suggestions without degrading app availability.

To enable Elastic Cloud (e.g. 14-day free trial):
1. Sign up at [cloud.elastic.co](https://cloud.elastic.co/).
2. Create an Elasticsearch deployment.
3. Copy the **Elasticsearch Endpoint URL** and create an **API Key** under Security.
4. On Render, set:
   - `ES_NODE`: `https://<deployment-name>.es.<region>.gcp.cloud.es.io:9243`
   - `ES_API_KEY`: `<your-api-key>`
5. Synchronize and populate the index from MongoDB by running:
   ```bash
   npm run reindex
   ```

---

## 10. Post-Deployment Verification Checklist

1. [ ] **Health Endpoint:** Visit `https://shopnest-backend.onrender.com/api/health`. Should return HTTP 200 with `status: "ok"` and connected MongoDB & Redis status.
2. [ ] **Version Endpoint:** Visit `https://shopnest-backend.onrender.com/api/version`. Should return deployment commit hash and metadata.
3. [ ] **Frontend Loading:** Open your Vercel deployment URL (e.g. `https://shopnest.vercel.app`). The homepage and product catalog should render without errors.
4. [ ] **Admin Login:** Log in using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Confirm navigation to `/admin/analytics`.
5. [ ] **Cookie Persistence:** Refresh the browser while logged in (`F5`). You should stay logged in via the silent refresh token flow.
6. [ ] **Image Upload:** In Vendor Studio (`/vendor/products` or `/vendor/profile`), upload a store logo or product image. Confirm it uploads to Supabase Storage and displays correctly.
7. [ ] **Checkout & Payment Flow:** As a customer, add products to cart, proceed to `/checkout`, click "Place Order", and confirm the Test Gateway modal opens and captures payment.
8. [ ] **PDF Invoice Download:** On `/orders/:id`, click "Download Invoice". The PDF receipt should download cleanly.

---

## 11. Troubleshooting & FAQ

### 1. Render Free Tier Cold Starts (~50s delay)
- **Symptom:** The first request after 15 minutes of inactivity takes 45–60 seconds to respond.
- **Cause:** Render free tier spins down idle web services.
- **Solution:** ShopNest includes a fire-and-forget warm-up ping in `main.jsx` (`fetch(`${VITE_BACKEND_URL}/api/health`, { mode: 'no-cors' })`) that fires immediately when any visitor lands on the frontend, waking up the instance before they click through to auth or checkout.

### 2. CORS Errors (`Origin ... not allowed by CORS`)
- **Symptom:** Browser console shows `CORS policy: No 'Access-Control-Allow-Origin' header is present`.
- **Solution:** Verify `CLIENT_URL` on Render matches your Vercel URL exactly (e.g. `https://shopnest.vercel.app` with no trailing slash). If using preview URLs, specify comma-separated origins: `https://shopnest.vercel.app,https://shopnest-preview.vercel.app`.

### 3. Cookies Not Set / 401 Unauthorized After Refresh
- **Symptom:** Refreshing the page logs you out immediately; `/api/auth/refresh` returns 401.
- **Solution:**
  - With Vercel proxy rewrite (`/api/(.*)` in `vercel.json`), set `COOKIE_SAMESITE=lax` and `COOKIE_SECURE=true`. The browser treats the requests as first-party.
  - If making direct cross-site requests to Render (`https://backend.onrender.com`), set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`. Browsers reject `SameSite=none` cookies without `Secure=true`.

### 4. MongooseServerSelectionError / MongoDB Atlas Connection Timeout
- **Symptom:** Backend fails to start with `Server selection timed out after 30000 ms`.
- **Solution:** Check MongoDB Atlas **Network Access**. Ensure `0.0.0.0/0` (Allow access from anywhere) is active. Render free instances do not have static IP addresses.

### 5. Webhook Payout Not Processing
- **Symptom:** Order shows "paid", but vendor payout status remains "pending".
- **Solution:** Ensure `BACKEND_PUBLIC_URL` on Render matches your live backend URL (`https://shopnest-backend.onrender.com`), not `http://localhost:5000`. The payment gateway uses `BACKEND_PUBLIC_URL` to dispatch HMAC-signed webhook events to `/api/payments/webhook`.

### 6. Supabase Storage Upload Fails (`SignatureDoesNotMatch` or CORS)
- **Symptom:** Image upload in product creation or store profile fails with S3 error.
- **Solution:**
  - Verify your bucket `marketplace-images` is marked as **Public**.
  - In Supabase Dashboard → Storage → Configuration, ensure CORS allows your frontend origin.
  - Confirm `S3_FORCE_PATH_STYLE=true` is set on Render.
