import puppeteer from 'puppeteer';

const SRC = '/Users/rnell/Local Sites/berg-react/server/proposals/berg-ai-summit-2026/deck.html';
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`file://${SRC}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('navHint').style.display = 'none';
  });
  await page.addStyleTag({ content: `* { transition: none !important; animation: none !important; }` });

  const total = await page.evaluate(() => document.querySelectorAll('.slide').length);
  const reports = [];
  for (let n = 0; n < total; n++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.slide').forEach((s, i) => {
        s.classList.remove('is-current', 'is-future', 'is-past', 'is-flipping-in', 'is-flipping-out', 'is-revealing', 'is-pre-flipping-back');
        s.classList.add(i === idx ? 'is-current' : 'is-future');
      });
    }, n);
    await new Promise(r => setTimeout(r, 100));
    const r = await page.evaluate((idx) => {
      const slide = document.querySelectorAll('.slide')[idx];
      const sR = slide.getBoundingClientRect();
      const overflows = [];
      // Compare each element's bounds against the slide bounds (since slide has overflow:hidden)
      slide.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const overRight = r.right - sR.right;
        const overBottom = r.bottom - sR.bottom;
        const overLeft = sR.left - r.left;
        const overTop = sR.top - r.top;
        const worst = Math.max(overRight, overBottom, overLeft, overTop);
        if (worst > 1) {
          const text = (el.textContent || '').trim().slice(0, 70);
          if (!text && el.tagName !== 'IMG') return;
          // Skip if any ancestor element scrolls (overflow: auto/scroll)
          let p = el.parentElement;
          let inScroll = false;
          while (p && p !== slide) {
            const ov = getComputedStyle(p).overflow;
            if (ov === 'auto' || ov === 'scroll') { inScroll = true; break; }
            p = p.parentElement;
          }
          overflows.push({
            tag: el.tagName.toLowerCase(),
            cls: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
            overR: Math.round(overRight),
            overB: Math.round(overBottom),
            overL: Math.round(overLeft),
            overT: Math.round(overTop),
            scrollable: inScroll,
            text,
          });
        }
      });
      return { slide: idx + 1, overflows: overflows.slice(0, 8) };
    }, n);
    if (r.overflows.length) reports.push(r);
  }
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
