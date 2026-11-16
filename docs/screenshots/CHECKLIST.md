# ShopNest Screenshot Capture Checklist

This checklist defines all portfolio and documentation screenshots for **ShopNest**, including exact paths, routes, user roles, visible elements, and capture specifications.

---

## Capture Best Practices

1. **Resolution & Viewport**:
   - **Desktop**: 1440px viewport width (1440 × 900 or 1440 × 1080) at 100% browser zoom in Chrome or Chromium.
   - **Mobile**: 390px viewport width (iPhone 12/13/14/15 preset in Chrome DevTools Device Mode).
2. **Theme**:
   - Capture in **Dark Mode** (`:root[data-theme="dark"]`) or **Light Mode** consistently.
3. **Clean Demo Data**:
   - Use clean, realistic seed data (e.g., from `npm run seed:vendors` or `npm run seed:demo`).
   - Avoid placeholder test junk or corrupted image URLs.
4. **File Format & Naming**:
   - Save as clean lowercase kebab-case `.png` files without spaces, brackets, or uppercase characters.
   - Drop the captured files directly into the matching subfolder under `docs/screenshots/`.

---

## 1. General & Storefront (`docs/screenshots/general/`)

| File Name | Route / Path | Role / Account | Visible UI Elements & State | Status |
| :--- | :--- | :--- | :--- | :---: |
| `landing-page.png` | `/` | Guest / Any | Hero section, ShopNest title, independent vendors gradient text, CTA buttons, revenue split bar graphic | [x] |
| `home-dark.png` | `/` | Guest / Any | Homepage in Dark Mode with hero cards and category links | [ ] |
| `login.png` | `/login` | Guest | Split-card authentication, email/password form, quick test role credentials | [ ] |
| `register-shop-sell.png` | `/register` | Guest | Shop / Sell segmented control toggle, seller onboarding fields | [ ] |
| `products-search-filters.png` | `/products` | Guest / Customer | Catalog grid, search input, category facets, price slider, sort dropdown | [ ] |
| `product-detail.png` | `/products/:id` | Guest / Customer | Image gallery, price, stock indicator, verified reviews list, Add to Cart | [ ] |
| `not-found.png` | `/any-invalid-route` | Guest / Any | Clean 404 error page with "Return to Home" action button | [ ] |

---

## 2. Customer Shopping Workflow (`docs/screenshots/customer/`)

| File Name | Route / Path | Role / Account | Visible UI Elements & State | Status |
| :--- | :--- | :--- | :--- | :---: |
| `customer-page.png` | `/products` | Customer | Customer logged in, full product catalog grid with filters, pricing, and Add buttons | [x] |
| `customer-cart-page.png` | `/cart` | Customer | Shopping cart with items grouped by vendor, item controls, order summary | [x] |
| `check-and-delivery.png` | `/checkout` | Customer | Checkout & Delivery screen with address inputs and vendor split summary | [x] |
| `payment-gateway.png` | `/checkout` | Customer | Sandbox payment modal in TEST MODE with credit card tabs and test card presets | [x] |
| `invoice-page.png` | `/orders/:orderId` | Customer | Order details with Download Invoice button, shipping address, vendor timeline | [x] |
| `payment-success.png` | `/order-success/:id` | Customer | Payment confirmation banner with generated sub-order breakdown | [ ] |
| `my-orders.png` | `/orders` | Customer | Customer order history list with status badges and details buttons | [ ] |
| `order-tracking.png` | `/orders/:id` | Customer | Per-vendor shipment tracking timeline (Placed -> Packed -> Shipped -> Delivered) | [ ] |
| `review-form.png` | `/orders/:id` | Customer | Verified buyer review modal with 1–5 star rating and comment textarea | [ ] |
| `become-seller-pending.png` | `/become-seller` | Customer | Seller onboarding pending approval screen with notification banner | [ ] |

---

## 3. Vendor Studio (`docs/screenshots/vendor/`)

| File Name | Route / Path | Role / Account | Visible UI Elements & State | Status |
| :--- | :--- | :--- | :--- | :---: |
| `vendor-studio.png` | `/vendor/products` | Vendor | Vendor Hub product catalog table, KPI summary cards, Add New Product button | [x] |
| `vendor-add-product.png` | `/vendor/products` | Vendor | Add / Edit Product modal with title, price, category, and multi-image upload | [ ] |
| `vendor-orders.png` | `/vendor/orders` | Vendor | Vendor sub-orders list with fulfillment status dropdown controls | [ ] |
| `vendor-earnings.png` | `/vendor/earnings` | Vendor | Net earnings, platform commission breakdown, payout ledger | [ ] |
| `vendor-store-profile.png` | `/vendor/profile` | Vendor | Store name, logo image, store description, commission percentage | [ ] |

---

## 4. Admin Governance & Operations (`docs/screenshots/admin/`)

| File Name | Route / Path | Role / Account | Visible UI Elements & State | Status |
| :--- | :--- | :--- | :--- | :---: |
| `admin-analytics.png` | `/admin` | Admin | Executive analytics overview, platform revenue, pending seller requests card | [ ] |
| `admin-vendor-approvals.png` | `/admin/vendors` | Admin | Vendor approvals manager with 44px Accept / Reject buttons | [ ] |
| `admin-coupons.png` | `/admin/coupons` | Admin | Coupon creator and manager table with discount rules | [ ] |
| `admin-orders.png` | `/admin/orders` | Admin | Master marketplace orders ledger with multi-vendor split breakdown | [ ] |
| `admin-payouts.png` | `/admin/payouts` | Admin | Vendor payout settlement ledger with transfer status | [ ] |

---

## 5. Mobile Views at 390px (`docs/screenshots/mobile/`)

| File Name | Route / Path | Device Viewport | Visible UI Elements & State | Status |
| :--- | :--- | :--- | :--- | :---: |
| `mobile-home.png` | `/` | 390 × 844 | Mobile homepage with hamburger navbar and stacked hero grid | [ ] |
| `mobile-products.png` | `/products` | 390 × 844 | Mobile catalog with filter drawer button and stacked product cards | [ ] |
| `mobile-cart.png` | `/cart` | 390 × 844 | Grouped multi-vendor cart with sticky bottom checkout action bar | [ ] |
| `mobile-vendor-orders.png` | `/vendor/orders` | 390 × 844 | Vendor sub-orders presented as mobile stacked cards | [ ] |
