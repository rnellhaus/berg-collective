import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

// Hits a running server (default localhost:3099) so we capture the
// proposal route's *injected* overlay alongside the deck CSS.
const BASE = process.env.BASE_URL || 'http://localhost:3099';
const PASSWORD = process.env.PASSWORD || 'berg2026';
const SLUG = 'berg-ai-summit-2026';
const OUT = '/tmp/deck-live-mobile';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  // Authenticate
  await page.goto(`${BASE}/proposals/${SLUG}`, { waitUntil: 'networkidle0' });
  await page.type('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type=submit]'),
  ]);

  // Wait for loader fade-out, kill transitions
  await new Promise(r => setTimeout(r, 2500));
  await page.addStyleTag({ content: `* { transition: none !important; animation: none !important; }` });
  await page.evaluate(() => {
    const loader = document.getElementById('loader'); if (loader) loader.style.display = 'none';
    const hint = document.getElementById('navHint'); if (hint) hint.style.display = 'none';
  });

  // Force overlay into idle (auto-hidden) state for the "clean" pass so we
  // can verify slide content reads correctly without the button on top.
  const idle = process.env.IDLE === '1';
  if (idle) {
    await page.evaluate(() => {
      const o = document.querySelector('.proposal-overlay');
      if (o) o.classList.add('is-idle');
    });
  }

  const total = await page.evaluate(() => document.querySelectorAll('.slide').length);
  for (let i = 1; i <= total; i++) {
    await page.evaluate((n) => {
      document.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.remove('is-current', 'is-future', 'is-past', 'is-flipping-in', 'is-flipping-out', 'is-revealing', 'is-pre-flipping-back');
        s.classList.add(idx === n - 1 ? 'is-current' : 'is-future');
      });
    }, i);
    await new Promise(r => setTimeout(r, 100));
    await page.screenshot({ path: `${OUT}/slide-${String(i).padStart(2, '0')}.png` });
  }
  console.log(`wrote ${total} slides to ${OUT} (idle=${idle})`);
} finally {
  await browser.close();
}
