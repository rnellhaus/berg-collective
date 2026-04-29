import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'server', 'proposals', 'berg-ai-summit-2026', 'deck.html');
const OUT = join(__dirname, '..', 'server', 'proposals', 'berg-ai-summit-2026', 'deck.pdf');

const SLIDE_W = 1280;
const SLIDE_H = 720;

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: SLIDE_W, height: SLIDE_H });
  await page.goto(`file://${SRC}`, { waitUntil: 'networkidle0', timeout: 60000 });

  // Inject print CSS so each .slide becomes its own page at exact dimensions.
  await page.addStyleTag({
    content: `
      @page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
      html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
      .deck-info { display: none !important; }
      .slide {
        margin: 0 !important;
        box-shadow: none !important;
        page-break-after: always;
        break-after: page;
        width: ${SLIDE_W}px !important;
        height: ${SLIDE_H}px !important;
      }
      .slide:last-child { page-break-after: auto; break-after: auto; }
    `,
  });

  await page.emulateMediaType('print');
  await page.pdf({
    path: OUT,
    width: `${SLIDE_W}px`,
    height: `${SLIDE_H}px`,
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
}
