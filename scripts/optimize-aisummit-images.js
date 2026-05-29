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

// slug -> source filename (relative to SRC). Missing files are skipped with a warning.
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
  // 'marcus-ellison': missing source — rendered as a gradient initials tile in the UI.
};

async function run() {
  await mkdir(SPEAKERS_OUT, { recursive: true });

  for (const [slug, file] of Object.entries(SPEAKERS)) {
    const src = join(SRC, file);
    if (!existsSync(src)) {
      console.warn(`  ! skip ${slug}: source not found (${file})`);
      continue;
    }
    const dest = join(SPEAKERS_OUT, `${slug}.webp`);
    await sharp(src)
      .rotate() // respect EXIF orientation
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
