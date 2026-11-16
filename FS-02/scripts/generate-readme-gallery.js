#!/usr/bin/env node

/**
 * Reusable README Screenshot Gallery Generator
 *
 * Scans docs/screenshots/ recursively, groups images by feature category,
 * formats responsive Markdown tables, and safely updates the root README.md
 * strictly between <!-- SCREENSHOTS:START --> and <!-- SCREENSHOTS:END -->.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(REPO_ROOT, "docs", "screenshots");
const README_PATH = path.join(REPO_ROOT, "README.md");
const CHECKLIST_PATH = path.join(REPO_ROOT, "CHECKLIST.md");

const START_MARKER = "<!-- SCREENSHOTS:START -->";
const END_MARKER = "<!-- SCREENSHOTS:END -->";

const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
]);

// Exact feature group sequence
const FEATURE_GROUPS = [
  { id: "general", title: "General", folder: "general", open: true },
  { id: "workspace", title: "Workspace", folder: "workspace", open: false },
  { id: "editor", title: "Editor", folder: "editor", open: false },
  { id: "collaboration", title: "Collaboration", folder: "collaboration", open: false },
  { id: "comments", title: "Comments", folder: "comments", open: false },
  { id: "version-history", title: "Version History", folder: "version-history", open: false },
  { id: "sharing-permissions", title: "Sharing & Permissions", folder: "sharing-permissions", open: false },
  { id: "account-settings", title: "Account Settings", folder: "account-settings", open: false },
  { id: "mobile", title: "Mobile", folder: "mobile", open: false },
];

/**
 * Formats a clean human-readable caption from filename.
 * e.g. "live-cursors.png" -> "Live cursors"
 */
function getCaption(filename) {
  const base = path.basename(filename, path.extname(filename));
  const text = base.replace(/[-_]+/g, " ").trim();
  if (!text) return base;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Recursively scans directory for image files.
 */
function scanDirectory(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const stat = fs.statSync(fullPath);
        const relFromScreenshots = path.relative(SCREENSHOTS_DIR, fullPath);
        const relFromRoot = path.relative(REPO_ROOT, fullPath).split(path.sep).join("/");
        results.push({
          filename: entry.name,
          fullPath,
          relFromRoot,
          relFromScreenshots,
          size: stat.size,
        });
      }
    }
  }

  return results;
}

/**
 * Determines feature group for an image based on parent folder or filename clues.
 */
function classifyImage(image) {
  const parts = image.relFromScreenshots.split(path.sep);
  if (parts.length > 1) {
    const folder = parts[0].toLowerCase();
    const matchedGroup = FEATURE_GROUPS.find((g) => g.folder === folder || g.id === folder);
    if (matchedGroup) return matchedGroup.id;
  }

  const name = image.filename.toLowerCase();
  if (name.includes("login") || name.includes("auth") || name.includes("landing")) return "general";
  if (name.includes("dashboard") || name.includes("workspace")) return "workspace";
  if (name.includes("editor") || name.includes("toolbar")) return "editor";
  if (name.includes("collab") || name.includes("cursor") || name.includes("presence")) return "collaboration";
  if (name.includes("comment") || name.includes("notification")) return "comments";
  if (name.includes("version") || name.includes("snapshot") || name.includes("history")) return "version-history";
  if (name.includes("share") || name.includes("member") || name.includes("permission")) return "sharing-permissions";
  if (name.includes("account") || name.includes("profile") || name.includes("setting")) return "account-settings";
  if (name.includes("mobile") || name.includes("responsive")) return "mobile";

  return "general";
}

/**
 * Builds markdown table for a group of images.
 */
function buildMarkdownTable(images, maxCols = 2) {
  if (images.length === 0) return "";
  const cols = Math.min(images.length, maxCols);

  const rows = [];
  for (let i = 0; i < images.length; i += cols) {
    const chunk = images.slice(i, i + cols);

    // Header row
    const headers = chunk.map((img) => getCaption(img.filename));
    while (headers.length < cols) headers.push(" ");
    rows.push(`| ${headers.join(" | ")} |`);

    // Separator row
    const separators = Array(cols).fill(":---:");
    rows.push(`| ${separators.join(" | ")} |`);

    // Image cells row
    const cells = chunk.map((img) => {
      const caption = getCaption(img.filename);
      return `<img src="${img.relFromRoot}" alt="${caption}" width="460"><br><sub><b>${caption}</b></sub>`;
    });
    while (cells.length < cols) cells.push(" ");
    rows.push(`| ${cells.join(" | ")} |`);
  }

  return rows.join("\n");
}

function generateGallery() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    throw new Error(`Screenshots directory not found at: ${SCREENSHOTS_DIR}`);
  }

  if (!fs.existsSync(README_PATH)) {
    throw new Error(`README.md not found at: ${README_PATH}`);
  }

  const images = scanDirectory(SCREENSHOTS_DIR);

  // Group images
  const grouped = new Map();
  for (const group of FEATURE_GROUPS) {
    grouped.set(group.id, []);
  }

  for (const img of images) {
    const groupId = classifyImage(img);
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(img);
  }

  // Generate markdown blocks
  const sections = [];

  // Check if CHECKLIST.md exists for missing screenshots reference
  if (fs.existsSync(CHECKLIST_PATH)) {
    try {
      const checklistContent = fs.readFileSync(CHECKLIST_PATH, "utf8");
      // Optional reference comment if checklist exists
      sections.push(`<!-- Reference checklist parsed from CHECKLIST.md -->`);
    } catch {}
  }

  for (const group of FEATURE_GROUPS) {
    const groupImages = grouped.get(group.id) || [];
    if (groupImages.length === 0) continue; // Skip groups with no images

    const openAttr = group.open ? " open" : "";
    const maxCols = group.id === "mobile" ? 3 : 2;
    const table = buildMarkdownTable(groupImages, maxCols);

    sections.push(
      `<details${openAttr}>\n<summary><b>${group.title}</b></summary>\n<br>\n\n${table}\n\n</details>`
    );
  }

  return sections.join("\n\n");
}

function updateReadme() {
  const gallery = generateGallery();
  const readmeContent = fs.readFileSync(README_PATH, "utf8");

  const startIndex = readmeContent.indexOf(START_MARKER);
  const endIndex = readmeContent.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `Markers ${START_MARKER} and ${END_MARKER} must both exist in README.md`
    );
  }

  if (endIndex < startIndex) {
    throw new Error("End marker appears before start marker in README.md");
  }

  // Count occurrences to ensure exact unique pair
  const startOccurrences = (readmeContent.match(new RegExp(START_MARKER, "g")) || []).length;
  const endOccurrences = (readmeContent.match(new RegExp(END_MARKER, "g")) || []).length;

  if (startOccurrences !== 1 || endOccurrences !== 1) {
    throw new Error("Duplicate or malformed screenshot markers detected in README.md");
  }

  const before = readmeContent.slice(0, startIndex + START_MARKER.length);
  const after = readmeContent.slice(endIndex);

  const updatedContent = `${before}\n\n${gallery}\n\n${after}`;

  fs.writeFileSync(README_PATH, updatedContent, "utf8");
  console.log("README.md screenshot gallery updated successfully.");
}

function verifyGallery() {
  const readme = fs.readFileSync(README_PATH, "utf8");
  const startOccurrences = (readme.match(new RegExp(START_MARKER, "g")) || []).length;
  const endOccurrences = (readme.match(new RegExp(END_MARKER, "g")) || []).length;

  if (startOccurrences !== 1 || endOccurrences !== 1) {
    throw new Error("Markers must exist exactly once in README.md");
  }

  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (startIdx >= endIdx) {
    throw new Error("Start marker must precede end marker in README.md");
  }

  const gallerySection = readme.slice(startIdx, endIdx);
  const imgRegex = /<img\s+[^>]*src="([^"]+)"/gi;
  let match;
  const foundPaths = [];
  while ((match = imgRegex.exec(gallerySection)) !== null) {
    foundPaths.push(match[1]);
  }

  if (foundPaths.length === 0) {
    throw new Error("No image references found in README gallery section");
  }

  const seen = new Set();
  for (const relPath of foundPaths) {
    if (seen.has(relPath)) {
      throw new Error(`Duplicate image reference found: ${relPath}`);
    }
    seen.add(relPath);

    if (relPath.startsWith("/") || relPath.startsWith("http") || relPath.includes("\\")) {
      throw new Error(`Path must be relative with forward slashes: ${relPath}`);
    }

    const fullPath = path.join(REPO_ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image file does not exist on disk: ${relPath}`);
    }

    const dir = path.dirname(fullPath);
    const base = path.basename(fullPath);
    const entries = fs.readdirSync(dir);
    if (!entries.includes(base)) {
      throw new Error(`Case mismatch on disk for file: ${relPath}`);
    }
  }

  const diskImages = scanDirectory(SCREENSHOTS_DIR);
  for (const diskImg of diskImages) {
    if (!foundPaths.includes(diskImg.relFromRoot)) {
      throw new Error(`Actual screenshot omitted from gallery: ${diskImg.relFromRoot}`);
    }
  }

  console.log(`Verification passed: all ${foundPaths.length} screenshots verified on disk and in README.`);
  return true;
}

if (require.main === module) {
  try {
    const isVerifyOnly = process.argv.includes("--verify");
    if (!isVerifyOnly) {
      updateReadme();
    }
    verifyGallery();
  } catch (err) {
    console.error("Gallery generation failed:", err.message);
    process.exit(1);
  }
}

module.exports = {
  scanDirectory,
  classifyImage,
  getCaption,
  buildMarkdownTable,
  generateGallery,
  updateReadme,
  verifyGallery,
};
