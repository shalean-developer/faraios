import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public/image/shalean-logo.png");
const publicDir = path.join(root, "public");
const imageDir = path.join(publicDir, "image");
const appDir = path.join(root, "app");

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
  const metadata = await sharp(source).metadata();
  const height = metadata.height ?? 395;
  const iconCrop = {
    left: 0,
    top: 0,
    width: Math.min(height, metadata.width ?? height),
    height,
  };

  const cropped = await sharp(source).extract(iconCrop).png().toBuffer();
  const trimmed = await sharp(cropped).trim({ threshold: 12 }).png().toBuffer();
  const matteFree = await knockOutWhiteMatte(trimmed);
  const transparent = await matteFree.png().toBuffer();

  return { iconBuffer: transparent, iconCrop };
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

const { iconBuffer, iconCrop } = await buildIconBuffer();

async function writeSquarePng(target, size) {
  await sharp(iconBuffer)
    .resize(size, size, {
      fit: "contain",
      background: transparentBg,
    })
    .png()
    .toFile(target);
}

await writeSquarePng(path.join(imageDir, "shalean-mark.png"), 512);
await writeSquarePng(path.join(appDir, "icon.png"), 512);
await writeSquarePng(path.join(appDir, "apple-icon.png"), 180);

for (const { file, size } of outputs) {
  await writeSquarePng(path.join(publicDir, file), size);
}

// PNG payload in .ico — supported by modern browsers and Next.js.
await writeSquarePng(path.join(publicDir, "favicon.ico"), 32);
await writeSquarePng(path.join(appDir, "favicon.ico"), 32);

console.log("Generated transparent favicons from public/image/shalean-logo.png");
console.log(`Icon crop: ${iconCrop.width}x${iconCrop.height}px from top-left`);
