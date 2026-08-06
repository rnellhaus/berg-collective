/**
 * Generates a white version of the BERG logo for use on dark backgrounds in
 * HTML email.
 *
 * The email template previously recolored the black logo with
 * `filter: brightness(0) invert(1)`. CSS filters are unsupported in Gmail and
 * most other mail clients, so the black artwork rendered as-is on the dark
 * green header and was nearly invisible. Email needs a real white asset.
 *
 * Recoloring uses the source alpha channel, so the glyph shapes are preserved
 * exactly and only the ink color changes.
 *
 * Run: node scripts/generate-email-logo.js
 */
import process from 'node:process';
import sharp from 'sharp';

const SOURCE = 'public/images/logo.png';
const OUTPUT = 'public/images/logo-white.png';

const source = sharp(SOURCE).ensureAlpha();
const { width, height } = await source.metadata();

// The artwork is black on transparent, so its alpha channel is the mask.
// Painting solid white through that mask yields the same shapes in white.
const alpha = await source.clone().extractChannel('alpha').toBuffer();

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .joinChannel(alpha)
  .png()
  .toFile(OUTPUT);

const result = await sharp(OUTPUT).metadata();
console.log(`Wrote ${OUTPUT} — ${result.width}x${result.height}, alpha: ${result.hasAlpha}`);
process.exit(0);
