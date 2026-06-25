import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set([
  "node_modules",
  ".next",
  ".git",
  "playwright-report",
  "test-results",
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".html",
  ".css",
  ".webmanifest",
]);

const PLACEHOLDER = "__FARAIOS_COMPANY_KEY__";

const replacements = [
  ["X-FaraiOS-Company-Key", PLACEHOLDER],
  ["Shalean OS", "FaraiOS"],
  ["Shalean", "FaraiOS"],
  ["shalean.com", "faraios.com"],
  ["SHALEAN_", "FARAIOS_"],
  ["shalean-logo", "faraios-logo"],
  ["shalean-mark", "faraios-mark"],
  ["connect-shalean-website", "connect-faraios-website"],
  ["publish-shalean-blogs", "publish-faraios-blogs"],
  ["create-shalean-website", "create-faraios-website"],
  ["reset-shalean-website", "reset-faraios-website"],
  ["promote_shalean_admin", "promote_faraios_admin"],
  ["shalean:connect", "faraios:connect"],
  [PLACEHOLDER, "X-FaraiOS-Company-Key"],
];

function shouldProcess(filePath) {
  if (path.basename(filePath) === "rebrand-to-faraios.mjs") return false;
  return textExtensions.has(path.extname(filePath));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (shouldProcess(full)) files.push(full);
  }
  return files;
}

function transform(content) {
  let next = content;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  return next;
}

let changed = 0;
for (const file of walk(root)) {
  const original = fs.readFileSync(file, "utf8");
  if (!/shalean/i.test(original)) continue;
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changed += 1;
    console.log(path.relative(root, file));
  }
}

const renames = [
  ["scripts/connect-shalean-website.mjs", "scripts/connect-faraios-website.mjs"],
  ["scripts/publish-shalean-blogs.mjs", "scripts/publish-faraios-blogs.mjs"],
  ["scripts/create-shalean-website.ts", "scripts/create-faraios-website.ts"],
  ["scripts/reset-shalean-website.ts", "scripts/reset-faraios-website.ts"],
  [
    "supabase/migrations/20260623120000_promote_shalean_admin_and_grants.sql",
    "supabase/migrations/20260623120000_promote_faraios_admin_and_grants.sql",
  ],
];

for (const [fromRel, toRel] of renames) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (fs.existsSync(from) && !fs.existsSync(to)) {
    fs.renameSync(from, to);
    console.log(`renamed ${fromRel} -> ${toRel}`);
  }
}

const imageDir = path.join(root, "public/image");
if (fs.existsSync(imageDir)) {
  const imageRenames = [
    ["shalean-logo.png", "faraios-logo.png"],
    ["shalean-mark.png", "faraios-mark.png"],
  ];
  for (const [fromName, toName] of imageRenames) {
    const from = path.join(imageDir, fromName);
    const to = path.join(imageDir, toName);
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      fs.renameSync(from, to);
      console.log(`renamed public/image/${fromName} -> ${toName}`);
    }
  }
}

console.log(`Updated ${changed} files.`);
