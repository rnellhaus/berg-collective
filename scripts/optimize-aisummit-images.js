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
  // Portrait source; auto-crop clipped the top of his head, so anchor near the top.
  'evol-greaves': { file: 'evol-headshot.jpg', extract: { left: 0, top: 60, width: 1237, height: 1237 } },
  'justin-williams': 'justin williams.jpeg',
  'justin-elliot': 'justin-elliot.png',
  'ian-grant': 'ian grant.jpeg',
  'tunde-ajaba-ogundipe': 'Tunde Ajaba-Ogundipe.jpeg',
  'monk-inyang': 'Monk Inyang.jpeg',
  'x-eyee': 'X-Eyee.png',
  'rich-nellhaus': '1774548295292-rich-headshot-new.jpg',
  'nana-bediako': 'Nana Bediako.jpeg',
  'ryan-moseley': 'ryanmoseley_headshot.png',
  'bert-gervais': 'bert gervais.jpeg',
  // Portrait source (1179x1640); attention-crop clipped his head, so anchor a
  // square on the face with headroom before the square resize.
  'marcus-ellison': { file: 'marcus ellison.jpeg', extract: { left: 200, top: 40, width: 900, height: 900 } },
  'chinedu-enekwe': 'chinedu-headshot.jpeg',
  // Small portrait (194x259); anchor square at the top to keep the full head.
  'frank-holland': { file: 'frank-holland.jpeg', extract: { left: 0, top: 0, width: 194, height: 194 } },
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

  // ── Sponsor logos ──
  // Rendered on light "chip" cards in the Sponsors section, so each logo keeps
  // its native dark/colored artwork (the page's white hero/footer logos would
  // disappear on white). Missing sponsors fall back to a text wordmark in the UI.
  const SPONSORS_OUT = join(OUT, 'sponsors');
  await mkdir(SPONSORS_OUT, { recursive: true });

  // Genius Potential — full-color illustrative mark; trim the transparent margin
  // and compress. Native colors read well on a white chip.
  const gpSrc = join(SRC, 'genius potential.avif');
  if (existsSync(gpSrc)) {
    const gpOut = join(SPONSORS_OUT, 'genius-potential.webp');
    await sharp(gpSrc)
      .trim()
      .resize(480, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(gpOut);
    console.log(`  ✓ sponsor genius-potential -> ${gpOut.replace(ROOT, '.')}`);
  } else {
    console.warn('  ! skip Genius Potential logo: source not found');
  }

  // Squarespace — only a white wordmark exists; invert to black for the light chip
  // (matches Squarespace's standard black wordmark).
  const ssSponsorSrc = join(SRC, 'squarespace-logo-horizontal-white.20250422154832839 (1).png');
  if (existsSync(ssSponsorSrc)) {
    const ssSponsorOut = join(SPONSORS_OUT, 'squarespace.webp');
    await sharp(ssSponsorSrc)
      .negate({ alpha: false })
      .trim()
      .resize(480, 140, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(ssSponsorOut);
    console.log(`  ✓ sponsor squarespace -> ${ssSponsorOut.replace(ROOT, '.')}`);
  } else {
    console.warn('  ! skip Squarespace sponsor logo: source not found');
  }

  // Hero lockup — the white-version PNG ships with a baked dark checker
  // background (no real alpha), so key out the neutral dark pixels into
  // transparency while preserving the white wordmark AND the blue "Ai"
  // monogram. Alpha = max(luminance key, chroma key): white text survives on
  // luminance, the saturated-blue monogram survives on chroma.
  const lockupSrc = join(SRC, 'logo-white-version.png');
  if (existsSync(lockupSrc)) {
    const lockupOut = join(OUT, 'lockup.webp');
    const { data, info } = await sharp(lockupSrc)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, p = 0; i < data.length; i += 3, p += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      // lum-25 kills the ~10-15 dark checker; *1.7 reaches full opacity by ~175.
      const a = Math.max(0, Math.min(255, Math.max((lum - 25) * 1.7, chroma * 2.2)));
      rgba[p] = r; rgba[p + 1] = g; rgba[p + 2] = b; rgba[p + 3] = Math.round(a);
    }
    await sharp(rgba, { raw: { width, height, channels: 4 } })
      .resize(1600, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(lockupOut);
    console.log(`  ✓ hero lockup (bg knocked out) -> ${lockupOut.replace(ROOT, '.')}`);
  }

  console.log('done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
