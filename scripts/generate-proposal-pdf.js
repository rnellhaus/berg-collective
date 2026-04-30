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
  // The interactive deck stacks slides absolutely and toggles visibility via
  // is-current/is-future/is-past classes — override all of that for print.
  await page.addStyleTag({
    content: `
      @page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
      html, body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
        width: ${SLIDE_W}px !important;
        height: auto !important;
        overflow: visible !important;
        perspective: none !important;
        transform-style: flat !important;
      }
      /* Hide interactive chrome */
      .loader, .slide-counter, .dots, .nav-hint, .nav-zone,
      .deck-info { display: none !important; }
      /* Stage becomes a plain block, not a fixed viewport */
      .stage, #stage {
        position: static !important;
        width: ${SLIDE_W}px !important;
        height: auto !important;
        perspective: none !important;
        transform-style: flat !important;
        overflow: visible !important;
      }
      /* Each slide: own page, fixed dimensions, fully visible */
      .slide,
      .slide.is-current,
      .slide.is-future,
      .slide.is-past,
      .slide.is-flipping-in,
      .slide.is-flipping-out,
      .slide.is-pre-flipping-back,
      .slide.is-revealing {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        width: ${SLIDE_W}px !important;
        height: ${SLIDE_H}px !important;
        transform: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        z-index: auto !important;
        transition: none !important;
        animation: none !important;
        backface-visibility: visible !important;
        -webkit-backface-visibility: visible !important;
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
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
