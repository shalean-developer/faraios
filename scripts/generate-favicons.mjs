import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public/image/faraios-logo.png");
const publicDir = path.join(root, "public");

const iconCrop = {
  left: 370,
  top: 110,
  width: 520,
  height: 520,
};

const outputs = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon-48x48.png", size: 48 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
];

const icon = sharp(source).extract(iconCrop).png();

for (const { file, size } of outputs) {
  await icon
    .clone()
    .resize(size, size)
    .toFile(path.join(publicDir, file));
}

await icon
  .clone()
  .resize(32, 32)
  .toFile(path.join(publicDir, "favicon.ico"));

console.log("Generated favicons in public/");
