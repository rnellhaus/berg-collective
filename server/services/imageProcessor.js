import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optimizedDir = path.join(__dirname, '..', 'optimized');

const SIZES = {
  thumb: { width: 200, quality: 80 },
  medium: { width: 800, quality: 82 },
  full: { width: 1600, quality: 85 },
};

export async function processImage(originalPath, mediaId, filename) {
  const baseName = path.parse(filename).name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const metadata = await sharp(originalPath).metadata();
  const results = {};

  for (const [size, config] of Object.entries(SIZES)) {
    const outName = `${mediaId}-${baseName}.webp`;
    const outPath = path.join(optimizedDir, size, outName);

    await sharp(originalPath)
      .resize({ width: config.width, withoutEnlargement: true })
      .webp({ quality: config.quality })
      .toFile(outPath);

    results[`webp_${size}`] = `${size}/${outName}`;
  }

  const fallbackName = `${mediaId}-${baseName}.jpg`;
  const fallbackPath = path.join(optimizedDir, 'fallback', fallbackName);

  await sharp(originalPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(fallbackPath);

  results.jpg_fallback = `fallback/${fallbackName}`;

  const fullWebpPath = path.join(optimizedDir, results.webp_full);
  const webpStats = fs.statSync(fullWebpPath);
  const originalStats = fs.statSync(originalPath);

  return {
    ...results,
    width: metadata.width,
    height: metadata.height,
    size_bytes: originalStats.size,
    webp_size_bytes: webpStats.size,
  };
}
