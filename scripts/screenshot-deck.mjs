import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const SRC = '/Users/rnell/Local Sites/berg-react/server/proposals/berg-ai-summit-2026/deck.html';
const OUT = process.argv[2] === 'desktop' ? '/tmp/deck-desktop' : '/tmp/deck-mobile';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const args = process.argv.slice(2);
  if (args[0] === 'desktop') {
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  } else {
    // iPhone 14 Pro
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  }
  await page.goto(`file://${SRC}`, { waitUntil: 'networkidle0' });
  // Wait for loader fade-out, hide overlays, kill all transitions for clean screenshots
  await new Promise(r => setTimeout(r, 2500));
  await page.addStyleTag({ content: `* { transition: none !important; animation: none !important; }` });
  await page.evaluate(() => {
    const loader = document.getElementById('loader'); if (loader) loader.style.display = 'none';
    const hint = document.getElementById('navHint'); if (hint) hint.style.display = 'none';
  });

  const total = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log('slides:', total);

  for (let i = 1; i <= total; i++) {
    await page.evaluate((n) => {
      // Force slide n to is-current, others to is-future
      document.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.remove('is-current', 'is-future', 'is-past', 'is-flipping-in', 'is-flipping-out');
        if (idx === n - 1) s.classList.add('is-current');
        else s.classList.add('is-future');
      });
    }, i);
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: `${OUT}/slide-${String(i).padStart(2, '0')}.png` });
  }
  console.log('done');
} finally {
  await browser.close();
}
