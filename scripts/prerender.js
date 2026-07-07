import http from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let puppeteer;
let launchOptions;
if (IS_SERVERLESS) {
  puppeteer = (await import('puppeteer-core')).default;
  const chromium = (await import('@sparticuz/chromium')).default;
  launchOptions = {
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  };
} else {
  puppeteer = (await import('puppeteer')).default;
  launchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 45678;

const ROUTES = [
  '/',
  '/about',
  '/programs',
  '/chapters',
  '/events',
  '/impact',
  '/partnerships',
  '/donate',
  '/membership',
  '/contact',
  '/volunteer',
  '/newsletter',
  '/aisummit',
  '/aisummit/openai',
  '/aisummit/survey',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        let filePath = join(DIST, decodeURIComponent(url.pathname));
        if (url.pathname.endsWith('/')) filePath = join(filePath, 'index.html');
        if (!existsSync(filePath) || (await readFile(filePath).then(() => false).catch(() => true))) {
          // SPA fallback
          filePath = join(DIST, 'index.html');
        }
        const ext = extname(filePath).toLowerCase();
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(body);
      } catch (err) {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html not found — run `npm run build` first');
    process.exit(1);
  }

  const server = await startServer();
  const browser = await puppeteer.launch(launchOptions);

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      const url = `http://localhost:${PORT}${route}`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      // Give usePageMeta's useEffect a tick to flush
      await new Promise((r) => setTimeout(r, 200));

      // Strip the <script type="module"> that re-hydrates; keep asset <script>s
      // Actually keep all scripts — hydration needs them.
      const html = await page.evaluate(() => {
        // Add marker so main.jsx uses hydrateRoot
        return '<!DOCTYPE html>' + document.documentElement.outerHTML;
      });
      await page.close();

      const outPath =
        route === '/'
          ? join(DIST, 'index.html')
          : join(DIST, route.replace(/^\//, ''), 'index.html');

      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, html, 'utf-8');
      console.log(`  ✓ prerendered ${route} -> ${outPath.replace(DIST, 'dist')}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`prerendered ${ROUTES.length} routes`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
