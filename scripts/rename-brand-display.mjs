import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipDirs = new Set(["node_modules", ".next", ".git", "playwright-report", "test-results"]);
const skipFileParts = [path.join("supabase", "migrations"), path.join("docs", "")];
const skipFiles = new Set([
  path.join("tests", "api-v1-health.test.ts"),
  path.join("app", "api", "v1", "health", "route.ts"),
  path.join("app", "api", "v1", "bookings", "route.ts"),
]);

const extensions = new Set([".ts", ".tsx", ".js", ".mjs"]);

const PLACEHOLDER = "X-FaraiOS-Company-Key";

function shouldProcess(filePath) {
  const rel = path.relative(root, filePath);
  if (skipFiles.has(rel.replaceAll("\\", "/"))) return false;
  for (const part of skipFileParts) {
    if (rel.replaceAll("\\", "/").startsWith(part.replaceAll("\\", "/"))) return false;
  }
  return extensions.has(path.extname(filePath));
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
  let next = content.split("X-FaraiOS-Company-Key").join(PLACEHOLDER);
  next = next.split("Shalean").join("Shalean");
  next = next.split(PLACEHOLDER).join("X-FaraiOS-Company-Key");
  return next;
}

let changed = 0;
for (const file of walk(root)) {
  const original = fs.readFileSync(file, "utf8");
  if (!original.includes("Shalean")) continue;
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changed += 1;
    console.log(path.relative(root, file));
  }
}

console.log(`Updated ${changed} files.`);
