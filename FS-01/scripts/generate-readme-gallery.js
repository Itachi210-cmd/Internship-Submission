#!/usr/bin/env node

/**
 * ShopNest README Screenshot Gallery Generator
 * Automatically rebuilds the Screenshots Gallery in README.md from files on disk.
 * Uses only Node.js built-in modules (fs, path).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');
const README_PATH = path.join(ROOT_DIR, 'README.md');

const MARKER_START = '<!-- SCREENSHOTS:START -->';
const MARKER_END = '<!-- SCREENSHOTS:END -->';

const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const GROUPS = [
  { key: 'general', title: 'General Storefront & Platform', open: true, cols: 2, width: 460 },
  { key: 'customer', title: 'Customer Shopping Workflow', open: false, cols: 2, width: 460 },
  { key: 'vendor', title: 'Vendor Studio & Management', open: false, cols: 2, width: 460 },
  { key: 'admin', title: 'Admin Governance & Operations', open: false, cols: 2, width: 460 },
  { key: 'mobile', title: 'Mobile Views (390px Viewport)', open: false, cols: 3, width: 280 },
];

const EXPECTED_CHECKLIST = [
  { category: 'general', file: 'landing-page.png', desc: 'Landing / Home Page' },
  { category: 'general', file: 'home-dark.png', desc: 'Homepage in Dark Mode' },
  { category: 'general', file: 'login.png', desc: 'Login page split card' },
  { category: 'general', file: 'register-shop-sell.png', desc: 'Registration with Shop/Sell selector' },
  { category: 'general', file: 'products-search-filters.png', desc: 'Catalog search & filter controls' },
  { category: 'general', file: 'product-detail.png', desc: 'Product detail gallery & verified reviews' },
  { category: 'general', file: 'not-found.png', desc: '404 Error page' },
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
  { category: 'vendor', file: 'vendor-studio.png', desc: 'Vendor Studio catalog & KPIs' },
  { category: 'vendor', file: 'vendor-add-product.png', desc: 'Add/Edit product modal' },
  { category: 'vendor', file: 'vendor-orders.png', desc: 'Vendor sub-orders & fulfillment' },
  { category: 'vendor', file: 'vendor-earnings.png', desc: 'Vendor earnings & platform split' },
  { category: 'vendor', file: 'vendor-store-profile.png', desc: 'Vendor store profile settings' },
  { category: 'admin', file: 'admin-analytics.png', desc: 'Admin analytics with pending requests' },
  { category: 'admin', file: 'admin-vendor-approvals.png', desc: 'Vendor approvals with Accept/Reject' },
  { category: 'admin', file: 'admin-coupons.png', desc: 'Platform coupon manager' },
  { category: 'admin', file: 'admin-orders.png', desc: 'Master orders & split payout ledger' },
  { category: 'admin', file: 'admin-payouts.png', desc: 'Vendor payouts transfer records' },
  { category: 'mobile', file: 'mobile-home.png', desc: 'Mobile homepage (390px)' },
  { category: 'mobile', file: 'mobile-products.png', desc: 'Mobile catalog with filters (390px)' },
  { category: 'mobile', file: 'mobile-cart.png', desc: 'Mobile multi-vendor cart (390px)' },
  { category: 'mobile', file: 'mobile-vendor-orders.png', desc: 'Mobile vendor orders cards (390px)' },
];

function formatCaption(fileName) {
  const base = path.parse(fileName).name;
  const words = base.replace(/[-_]+/g, ' ').trim();
  if (!words) return fileName;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function getImagesForGroup(groupKey) {
  const dirPath = path.join(SCREENSHOTS_DIR, groupKey);
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return VALID_EXTENSIONS.has(ext);
  });

  return files.sort().map((f) => ({
    fileName: f,
    relativePath: `docs/screenshots/${groupKey}/${f}`,
    caption: formatCaption(f),
  }));
}

function buildTable(images, cols, imgWidth) {
  const headerCols = Array(cols).fill('Screenshot');
  const alignCols = Array(cols).fill(':---:');

  const lines = [
    `| ${headerCols.join(' | ')} |`,
    `| ${alignCols.join(' | ')} |`,
  ];

  for (let i = 0; i < images.length; i += cols) {
    const chunk = images.slice(i, i + cols);
    const rowCells = chunk.map((img) => {
      return `<img src="${img.relativePath}" alt="${img.caption}" width="${imgWidth}" /><br>**${img.caption}**`;
    });

    while (rowCells.length < cols) {
      rowCells.push('&nbsp;');
    }

    lines.push(`| ${rowCells.join(' | ')} |`);
  }

  return lines.join('\n');
}

function generateGalleryMarkdown() {
  const sections = [];
  const existingFiles = new Set();
  let totalCount = 0;

  for (const group of GROUPS) {
    const images = getImagesForGroup(group.key);
    if (images.length === 0) continue;

    images.forEach((img) => existingFiles.add(`${group.key}/${img.fileName}`));
    totalCount += images.length;

    const countLabel = `${images.length} screenshot${images.length === 1 ? '' : 's'}`;
    const tagOpen = group.open ? '<details open>' : '<details>';

    sections.push(`${tagOpen}
<summary><strong>${group.title}</strong> (${countLabel})</summary>

${buildTable(images, group.cols, group.width)}

</details>`);
  }

  // Calculate missing expected checklist items
  const missingItems = EXPECTED_CHECKLIST.filter(
    (item) => !existingFiles.has(`${item.category}/${item.file}`)
  );

  let missingComment = '';
  if (missingItems.length > 0) {
    const missingLines = missingItems.map(
      (m) => `  - [ ] docs/screenshots/${m.category}/${m.file} (${m.desc})`
    );
    missingComment = `\n<!--\nPending capture checklist (${missingItems.length} remaining):\n${missingLines.join('\n')}\n-->\n`;
  }

  const galleryBody = sections.join('\n\n') + missingComment;
  return { galleryBody, totalCount, missingCount: missingItems.length };
}

function updateReadme() {
  if (!fs.existsSync(README_PATH)) {
    console.error(`[Error] README.md not found at: ${README_PATH}`);
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const { galleryBody, totalCount, missingCount } = generateGalleryMarkdown();

  const newSection = `${MARKER_START}\n${galleryBody}\n${MARKER_END}`;

  let updatedContent;
  if (readmeContent.includes(MARKER_START) && readmeContent.includes(MARKER_END)) {
    const startIndex = readmeContent.indexOf(MARKER_START);
    const endIndex = readmeContent.indexOf(MARKER_END) + MARKER_END.length;
    updatedContent =
      readmeContent.slice(0, startIndex) +
      newSection +
      readmeContent.slice(endIndex);
  } else {
    // Look for ## Screenshots Gallery heading
    const targetHeading = '## Screenshots Gallery';
    const headingIndex = readmeContent.indexOf(targetHeading);

    if (headingIndex !== -1) {
      // Find the next H2 heading or EOF
      const afterHeading = readmeContent.slice(headingIndex);
      const nextH2Match = afterHeading.slice(targetHeading.length).search(/\n##\s/);

      let replaceEnd;
      if (nextH2Match !== -1) {
        replaceEnd = headingIndex + targetHeading.length + nextH2Match;
      } else {
        replaceEnd = readmeContent.length;
      }

      const introNotice = `\n\n> Real visual assets captured from ShopNest live instances. Re-generate this gallery at any time by running \`node scripts/generate-readme-gallery.js\`.\n\n`;
      updatedContent =
        readmeContent.slice(0, headingIndex + targetHeading.length) +
        introNotice +
        newSection +
        '\n\n' +
        readmeContent.slice(replaceEnd).trimStart();
    } else {
      console.warn('[Warn] Could not find "## Screenshots Gallery" heading in README.md. Appending at bottom.');
      updatedContent = `${readmeContent}\n\n## Screenshots Gallery\n\n${newSection}\n`;
    }
  }

  fs.writeFileSync(README_PATH, updatedContent, 'utf8');
  console.log(`[Success] README.md gallery updated with ${totalCount} screenshots (${missingCount} pending capture).`);
}

updateReadme();
