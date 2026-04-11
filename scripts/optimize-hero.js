import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public', 'images', 'photos');
const SOURCE = join(PUBLIC_DIR, 'DTRT-crowd-photo.jpg');

const widths = [640, 960, 1280, 1920];

async function run() {
  for (const w of widths) {
    const webpOut = join(PUBLIC_DIR, `DTRT-crowd-photo-${w}.webp`);
    const jpgOut = join(PUBLIC_DIR, `DTRT-crowd-photo-${w}.jpg`);
    await sharp(SOURCE).resize({ width: w }).webp({ quality: 80 }).toFile(webpOut);
    await sharp(SOURCE).resize({ width: w }).jpeg({ quality: 82, mozjpeg: true }).toFile(jpgOut);
    console.log(`wrote ${w}w webp + jpg`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
