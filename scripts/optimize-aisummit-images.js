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
  // Rendered as white/light marks on dark "glass" chips (matching the page's
  // card system). Monochrome black logos are inverted to white so they show on
  // the dark UI; logos already supplied in white are used as-is; full-color
  // marks are kept as-is. Sources live alongside the outputs in
  // /images/aisummit/sponsors. Missing sources fall back to a text wordmark.
  const SPONSORS_OUT = join(OUT, 'sponsors');
  await mkdir(SPONSORS_OUT, { recursive: true });

  // mode: 'invert' (black-on-transparent → white), 'whiteout' (color-on-solid-white
  // → white knockout on transparent), or 'asis' (already white / full-color).
  const SPONSOR_LOGOS = [
    { slug: 'openai', file: 'OAI_OpenAI_Wordmark_Black.svg', mode: 'invert', box: [480, 96] },
    { slug: 'anthropic', file: 'anthropic-wordmark-black.svg', mode: 'invert', box: [480, 96] },
    // Supplied as a white wordmark on transparent — use as-is on the dark chip.
    { slug: 'squarespace', file: 'squarespace-logo-horizontal-white.20250422154832839 (1) (1).png', mode: 'asis', box: [480, 120] },
    // Navy + yellow mark on an opaque white plate — knock out the white to a
    // clean white reversed logo so it reads on the dark UI.
    { slug: 'betterment', file: 'betterment-logo-vector-2023.png', mode: 'whiteout', box: [480, 120] },
    // White stacked logo on transparent — use as-is.
    { slug: 'blacktech-meetup', file: 'BTM_logo-white.png', mode: 'asis', box: [440, 180] },
    // Full-color illustrative mark — keep native colors (bright interior reads on dark).
    { slug: 'genius-potential', file: 'Genius potential LOGO-06.png', mode: 'asis', box: [440, 220] },
  ];
  for (const { slug, file, mode, box } of SPONSOR_LOGOS) {
    const src = join(SPONSORS_OUT, file);
    if (!existsSync(src)) {
      console.warn(`  ! skip sponsor ${slug}: source not found (${file})`);
      continue;
    }
    let pipe;
    if (mode === 'whiteout') {
      // Build alpha from distance-to-white so both the navy wordmark and the
      // yellow icon survive, then paint every surviving pixel white.
      const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const { width, height } = info;
      const rgba = Buffer.alloc(width * height * 4);
      for (let i = 0, p = 0; i < data.length; i += 3, p += 4) {
        const deficit = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
        const a = Math.max(0, Math.min(255, (deficit - 12) * 1.4));
        rgba[p] = 255; rgba[p + 1] = 255; rgba[p + 2] = 255; rgba[p + 3] = Math.round(a);
      }
      pipe = sharp(rgba, { raw: { width, height, channels: 4 } });
    } else {
      pipe = sharp(src, { density: 300 });
      if (mode === 'invert') pipe = pipe.negate({ alpha: false }); // black mark -> white mark
    }
    await pipe
      .trim()
      .resize(box[0], box[1], { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(join(SPONSORS_OUT, `${slug}.webp`));
    console.log(`  ✓ sponsor ${slug} -> ./public/images/aisummit/sponsors/${slug}.webp`);
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
