// One-off image optimizer for the /aisummit landing page.
// Generates square, face-aware webp speaker headshots + an optimized OG image
// into public/images/aisummit/. Source files are left untouched.
//
//   node scripts/optimize-aisummit-images.js
//
// Re-run any time source art changes. Output is committed so the build/prerender
// never depends on this script.

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'public', 'images', 'AI Summit');
const OUT = join(ROOT, 'public', 'images', 'aisummit');
const SPEAKERS_OUT = join(OUT, 'speakers');

// slug -> source filename (relative to SRC), or { file, extract } to pre-crop a
// region before the square resize. Missing files are skipped with a warning.
const SPEAKERS = {
  'dion-ridley': 'dion_headshot.jpg',
  'evol-greaves': 'evol-headshot.jpg',
  'justin-williams': 'justin williams.jpeg',
  'justin-elliot': 'justin-elliot.png',
  'ian-grant': 'ian grant.jpeg',
  'tunde-ajaba-ogundipe': 'Tunde Ajaba-Ogundipe.jpeg',
  'monk-inyang': 'Monk Inyang.jpeg',
  'x-eyee': 'X-Eyee.png',
  'rich-nellhaus': '1774548295292-rich-headshot-new.jpg',
  // Source (800x800) has a LinkedIn "#HIRING" banner in the bottom-left; crop the
  // face region above/right of it before the square resize.
  'marcus-ellison': { file: 'marcus-ellison.jpeg', extract: { left: 345, top: 45, width: 455, height: 455 } },
};

async function run() {
  await mkdir(SPEAKERS_OUT, { recursive: true });

  for (const [slug, entry] of Object.entries(SPEAKERS)) {
    const file = typeof entry === 'string' ? entry : entry.file;
    const extract = typeof entry === 'string' ? null : entry.extract;
    const src = join(SRC, file);
    if (!existsSync(src)) {
      console.warn(`  ! skip ${slug}: source not found (${file})`);
      continue;
    }
    const dest = join(SPEAKERS_OUT, `${slug}.webp`);
    let pipe = sharp(src).rotate(); // respect EXIF orientation
    if (extract) pipe = pipe.extract(extract);
    await pipe
      .resize(560, 560, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      .toFile(dest);
    console.log(`  ✓ speaker ${slug} -> ${dest.replace(ROOT, '.')}`);
  }

  // OG / social share image — keep the designed square art, just compress.
  const ogSrc = join(SRC, 'final-square-APPROVED.png');
  if (existsSync(ogSrc)) {
    const ogJpg = join(OUT, 'og-amplified-intelligence.jpg');
    await sharp(ogSrc)
      .resize(1200, 1200, { fit: 'cover' })
      .jpeg({ quality: 84, progressive: true })
      .toFile(ogJpg);
    console.log(`  ✓ og image -> ${ogJpg.replace(ROOT, '.')}`);
  } else {
    console.warn('  ! skip OG image: final-square-APPROVED.png not found');
  }

  // Squarespace presenting logo (white wordmark, transparent) — keep alpha.
  const ssSrc = join(SRC, 'squarespace-logo-horizontal-white.20250422154832839 (1).png');
  if (existsSync(ssSrc)) {
    const ssOut = join(OUT, 'squarespace-white.webp');
    await sharp(ssSrc)
      .resize(480, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(ssOut);
    console.log(`  ✓ squarespace logo -> ${ssOut.replace(ROOT, '.')}`);
  } else {
    console.warn('  ! skip Squarespace logo: source not found');
  }

  // BERG Collective "organized by" logo — source is black-on-transparent, so
  // invert the color channels (keep alpha) to get a clean white logo for the dark UI.
  const bergSrc = join(ROOT, 'public', 'images', 'logo.png');
  if (existsSync(bergSrc)) {
    const bergOut = join(OUT, 'berg-white.webp');
    await sharp(bergSrc)
      .negate({ alpha: false })
      .resize(360, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(bergOut);
    console.log(`  ✓ berg logo -> ${bergOut.replace(ROOT, '.')}`);
  } else {
    console.warn('  ! skip BERG logo: public/images/logo.png not found');
  }

  // Hero lockup — flatten transparency onto deep-space and trim weight a touch.
  const lockupSrc = join(SRC, 'logo-amplified-intelligence-transparent.png');
  if (existsSync(lockupSrc)) {
    const lockupOut = join(OUT, 'lockup.webp');
    await sharp(lockupSrc)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(lockupOut);
    console.log(`  ✓ hero lockup -> ${lockupOut.replace(ROOT, '.')}`);
  }

  console.log('done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
