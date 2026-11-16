#!/usr/bin/env node

/**
 * Screenshot Checklist Verification Script
 * Validates the presence of expected portfolio and documentation screenshots.
 * Uses only Node.js built-in modules (fs, path).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');

const EXPECTED_SCREENSHOTS = [
  // General & Authentication
  { category: 'general', file: 'landing-page.png', desc: 'Homepage / Landing in Dark Mode' },
  { category: 'general', file: 'home-dark.png', desc: 'Homepage in Dark Mode' },
  { category: 'general', file: 'login.png', desc: 'Login page split card' },
  { category: 'general', file: 'register-shop-sell.png', desc: 'Registration with Shop/Sell selector' },
  { category: 'general', file: 'products-search-filters.png', desc: 'Catalog search & filter controls' },
  { category: 'general', file: 'product-detail.png', desc: 'Product detail gallery & verified reviews' },
  { category: 'general', file: 'not-found.png', desc: '404 Error page' },

  // Customer Workflow
  { category: 'customer', file: 'customer-page.png', desc: 'Customer catalog browsing' },
  { category: 'customer', file: 'customer-cart-page.png', desc: 'Shopping cart with multi-vendor groups' },
  { category: 'customer', file: 'check-and-delivery.png', desc: 'Checkout & delivery address' },
  { category: 'customer', file: 'payment-gateway.png', desc: 'Payment gateway simulation modal' },
  { category: 'customer', file: 'invoice-page.png', desc: 'Order details & invoice' },
  { category: 'customer', file: 'payment-success.png', desc: 'Payment confirmation & sub-orders' },
  { category: 'customer', file: 'my-orders.png', desc: 'Customer order history' },
  { category: 'customer', file: 'order-tracking.png', desc: 'Order tracking timeline per vendor' },
  { category: 'customer', file: 'review-form.png', desc: 'Product review submission form' },
  { category: 'customer', file: 'become-seller-pending.png', desc: 'Seller onboarding pending status' },

  // Vendor Studio
  { category: 'vendor', file: 'vendor-studio.png', desc: 'Vendor Studio catalog & KPIs' },
  { category: 'vendor', file: 'vendor-add-product.png', desc: 'Add/Edit product modal with image upload' },
  { category: 'vendor', file: 'vendor-orders.png', desc: 'Vendor sub-orders & fulfillment status' },
  { category: 'vendor', file: 'vendor-earnings.png', desc: 'Vendor earnings & platform split summary' },
  { category: 'vendor', file: 'vendor-store-profile.png', desc: 'Vendor store profile settings' },

  // Admin Operations
  { category: 'admin', file: 'admin-analytics.png', desc: 'Admin analytics with pending requests card' },
  { category: 'admin', file: 'admin-vendor-approvals.png', desc: 'Vendor approvals with 44px Accept/Reject' },
  { category: 'admin', file: 'admin-coupons.png', desc: 'Platform coupon manager' },
  { category: 'admin', file: 'admin-orders.png', desc: 'Master orders & split payout ledger' },
  { category: 'admin', file: 'admin-payouts.png', desc: 'Vendor payouts transfer records' },

  // Mobile Views
  { category: 'mobile', file: 'mobile-home.png', desc: 'Mobile homepage (390px)' },
  { category: 'mobile', file: 'mobile-products.png', desc: 'Mobile catalog with filters (390px)' },
  { category: 'mobile', file: 'mobile-cart.png', desc: 'Mobile multi-vendor cart (390px)' },
  { category: 'mobile', file: 'mobile-vendor-orders.png', desc: 'Mobile vendor orders cards (390px)' },
];

function checkScreenshots() {
  console.log('\n======================================================');
  console.log('       ShopNest Screenshot Inventory Auditor          ');
  console.log('======================================================\n');

  let presentCount = 0;
  let missingCount = 0;

  // Group by category
  const categories = {};
  EXPECTED_SCREENSHOTS.forEach((item) => {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  });

  for (const [category, items] of Object.entries(categories)) {
    console.log(`📂 docs/screenshots/${category}/`);
    items.forEach((item) => {
      const filePath = path.join(SCREENSHOTS_DIR, item.category, item.file);
      const exists = fs.existsSync(filePath);

      if (exists) {
        presentCount++;
        const stats = fs.statSync(filePath);
        const kbSize = (stats.size / 1024).toFixed(1);
        console.log(`  [✓] ${item.file.padEnd(30)} (${kbSize} KB) - ${item.desc}`);
      } else {
        missingCount++;
        console.log(`  [ ] ${item.file.padEnd(30)} (MISSING)  - ${item.desc}`);
      }
    });
    console.log('');
  }

  const total = EXPECTED_SCREENSHOTS.length;
  const pct = Math.round((presentCount / total) * 100);

  console.log('------------------------------------------------------');
  console.log(`Summary: ${presentCount} / ${total} screenshots present (${pct}%)`);
  if (missingCount > 0) {
    console.log(`Pending capture: ${missingCount} files remaining.`);
    console.log('Refer to docs/screenshots/CHECKLIST.md for capture specifications.');
  } else {
    console.log('All required screenshots are captured and present!');
  }
  console.log('------------------------------------------------------\n');

  // Always exit 0 per requirements
  process.exit(0);
}

checkScreenshots();
