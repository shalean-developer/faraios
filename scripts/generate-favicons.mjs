import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const imageDir = path.join(publicDir, "image");
const appDir = path.join(root, "app");

const logoPath = path.join(imageDir, "faraios-logo.png");

/** Turn near-white pixels transparent (logo exports often include a white matte). */
async function knockOutWhiteMatte(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r >= 240 && g >= 240 && b >= 240) {
      pixels[i + 3] = 0;
    }
  }

  return sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });
}

async function buildIconBuffer() {
  if (!fs.existsSync(logoPath)) {
    throw new Error(
      "Missing public/image/faraios-logo.png — add the logo asset there."
    );
  }

  const trimmedFull = await sharp(logoPath).trim({ threshold: 12 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmedFull).metadata();
  const height = trimmedMeta.height ?? 494;
  const width = trimmedMeta.width ?? height;
  const iconSide = Math.min(height, width);

  const iconCrop = {
    left: 0,
    top: 0,
    width: iconSide,
    height,
  };

  const cropped = await sharp(trimmedFull).extract(iconCrop).png().toBuffer();
  const matteFree = await knockOutWhiteMatte(cropped);
  return matteFree.png().toBuffer();
}

const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

const outputs = [
  { file: "favicon-16x16.png", size: 16 },
  { file: "favicon-32x32.png", size: 32 },
  { file: "favicon-48x48.png", size: 48 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "android-chrome-192x192.png", size: 192 },
  { file: "android-chrome-512x512.png", size: 512 },
];

const iconBuffer = await buildIconBuffer();

async function writeSquarePng(target, size) {
  await sharp(iconBuffer)
    .resize(size, size, {
      fit: "contain",
      background: transparentBg,
    })
    .png()
    .toFile(target);
}

await writeSquarePng(path.join(appDir, "icon.png"), 512);
await writeSquarePng(path.join(appDir, "apple-icon.png"), 180);

for (const { file, size } of outputs) {
  await writeSquarePng(path.join(publicDir, file), size);
}

await writeSquarePng(path.join(publicDir, "favicon.ico"), 32);
await writeSquarePng(path.join(appDir, "favicon.ico"), 32);

const logoMeta = await sharp(logoPath).metadata();
console.log("Favicons generated from public/image/faraios-logo.png");
console.log(`Logo asset: faraios-logo.png (${logoMeta.width}x${logoMeta.height})`);
