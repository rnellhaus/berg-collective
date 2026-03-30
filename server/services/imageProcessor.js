import sharp from 'sharp';
import { put } from '@vercel/blob';

const SIZES = {
  thumb:  { width: 200,  quality: 80 },
  medium: { width: 800,  quality: 82 },
  full:   { width: 1600, quality: 85 },
};

export async function processImage(buffer, mediaId, filename) {
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const metadata = await sharp(buffer).metadata();
  const results = {};

  for (const [size, config] of Object.entries(SIZES)) {
    const webpBuffer = await sharp(buffer)
      .resize({ width: config.width, withoutEnlargement: true })
      .webp({ quality: config.quality })
      .toBuffer();

    const blobName = `media/${size}/${mediaId}-${baseName}.webp`;
    const blob = await put(blobName, webpBuffer, {
      access: 'public',
      contentType: 'image/webp',
    });
    results[`webp_${size}`] = blob.url;
  }

  // JPEG fallback
  const jpgBuffer = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const fallbackBlob = await put(
    `media/fallback/${mediaId}-${baseName}.jpg`,
    jpgBuffer,
    { access: 'public', contentType: 'image/jpeg' }
  );
  results.jpg_fallback = fallbackBlob.url;

  // Get webp size for stats
  const fullWebpBuffer = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return {
    ...results,
    width: metadata.width,
    height: metadata.height,
    size_bytes: buffer.length,
    webp_size_bytes: fullWebpBuffer.length,
  };
}
