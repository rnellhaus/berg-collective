import { Router } from 'express';
import { readFile, stat } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROPOSAL_DIR = join(__dirname, '..', 'proposals');

const PROPOSALS = {
  'berg-ai-summit-2026': {
    title: 'BERG AI Summit — Sponsor Prospectus',
    htmlPath: join(PROPOSAL_DIR, 'berg-ai-summit-2026', 'deck.html'),
    pdfPath: join(PROPOSAL_DIR, 'berg-ai-summit-2026', 'deck.pdf'),
    downloadName: 'BERG-AI-Summit-2026-Prospectus.pdf',
  },
};

const COOKIE_TTL_DAYS = 7;
const COOKIE_TTL_MS = COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000;

function cookieName(slug) {
  return `proposal_${slug.replace(/[^a-z0-9]/gi, '_')}`;
}

function isAuthorized(req, slug) {
  const token = req.cookies?.[cookieName(slug)];
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.slug === slug && payload.scope === 'proposal';
  } catch {
    return false;
  }
}

function getPassword() {
  return process.env.PROPOSAL_PASSWORD || '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gatePage({ slug, title, error }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(title)} — Access</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background: #000;
    color: #fff;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: #0c0c0c;
    border: 1px solid rgba(212, 175, 55, 0.25);
    padding: 40px 36px;
  }
  .eyebrow {
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #D4AF37;
    margin: 0 0 14px;
  }
  h1 {
    font-weight: 800;
    font-size: 26px;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 0 0 8px;
  }
  p.lede {
    color: rgba(255,255,255,0.65);
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 28px;
  }
  label {
    display: block;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 8px;
    font-weight: 600;
  }
  input[type="password"] {
    width: 100%;
    padding: 12px 14px;
    background: #000;
    border: 1px solid rgba(255,255,255,0.18);
    color: #fff;
    font-size: 15px;
    font-family: inherit;
    outline: none;
  }
  input[type="password"]:focus { border-color: #D4AF37; }
  button {
    width: 100%;
    margin-top: 16px;
    padding: 13px 16px;
    background: #D4AF37;
    color: #000;
    border: 0;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    font-family: inherit;
  }
  button:hover { background: #e6c34a; }
  .err {
    margin-top: 14px;
    padding: 10px 12px;
    background: rgba(220, 50, 50, 0.12);
    border: 1px solid rgba(220, 50, 50, 0.4);
    color: #ff8a8a;
    font-size: 13px;
  }
  .foot {
    margin-top: 22px;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
  }
  .foot a { color: rgba(255,255,255,0.6); text-decoration: none; }
</style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">BERG Collective</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="lede">This proposal is private. Enter the access code shared with you to view and download it.</p>
    <form method="POST" action="/proposals/${encodeURIComponent(slug)}/auth" autocomplete="off">
      <label for="password">Access code</label>
      <input id="password" name="password" type="password" autofocus required />
      <button type="submit">Unlock</button>
      ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
    </form>
    <p class="foot">Trouble accessing this? Contact <a href="mailto:hello@bergcollective.org">hello@bergcollective.org</a>.</p>
  </main>
</body>
</html>`;
}

const downloadButtonScript = `
<style id="proposal-overlay-css">
  @media screen {
    .proposal-overlay {
      position: fixed; top: 16px; right: 16px; z-index: 9999;
      display: flex; gap: 8px;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .proposal-overlay a {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 16px;
      background: #D4AF37; color: #000;
      text-decoration: none;
      font-weight: 700; font-size: 12px;
      letter-spacing: 0.12em; text-transform: uppercase;
      border: 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .proposal-overlay a.secondary {
      background: rgba(255,255,255,0.08); color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .proposal-overlay a:hover { filter: brightness(1.1); }
  }
  @media print { .proposal-overlay { display: none !important; } }
</style>
<div class="proposal-overlay">
  <a class="secondary" href="/proposals/__SLUG__/logout">Lock</a>
  <a href="/proposals/__SLUG__/download">Download PDF</a>
</div>
`;

function injectOverlay(html, slug) {
  const overlay = downloadButtonScript.replace(/__SLUG__/g, encodeURIComponent(slug));
  // Insert after <body ...> opening tag.
  const bodyOpenMatch = html.match(/<body[^>]*>/i);
  if (!bodyOpenMatch) return html + overlay;
  const idx = bodyOpenMatch.index + bodyOpenMatch[0].length;
  return html.slice(0, idx) + overlay + html.slice(idx);
}

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts. Try again later.',
});

// GET /:slug — gate page (or redirect to view if already authorized)
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const proposal = PROPOSALS[slug];
  if (!proposal) return res.status(404).send('Proposal not found');

  if (isAuthorized(req, slug)) {
    return res.redirect(`/proposals/${encodeURIComponent(slug)}/view`);
  }

  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).type('html').send(gatePage({ slug, title: proposal.title, error: req.query.error || '' }));
});

// POST /:slug/auth — verify password, set cookie, redirect to view
router.post('/:slug/auth', authLimiter, async (req, res) => {
  const { slug } = req.params;
  const proposal = PROPOSALS[slug];
  if (!proposal) return res.status(404).send('Proposal not found');

  const expected = getPassword();
  if (!expected) {
    console.error('PROPOSAL_PASSWORD env var is not set');
    return res.status(500).type('html').send(gatePage({ slug, title: proposal.title, error: 'Server is not configured. Contact the sender.' }));
  }

  const submitted = (req.body?.password || '').toString();
  if (submitted !== expected) {
    return res.status(401).type('html').send(gatePage({ slug, title: proposal.title, error: 'Incorrect access code.' }));
  }

  const token = jwt.sign({ slug, scope: 'proposal' }, JWT_SECRET, { expiresIn: `${COOKIE_TTL_DAYS}d` });
  res.cookie(cookieName(slug), token, {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: 'lax',
    maxAge: COOKIE_TTL_MS,
    path: '/proposals',
  });
  res.redirect(`/proposals/${encodeURIComponent(slug)}/view`);
});

// GET /:slug/logout — clear cookie
router.get('/:slug/logout', (req, res) => {
  const { slug } = req.params;
  res.clearCookie(cookieName(slug), { path: '/proposals' });
  res.redirect(`/proposals/${encodeURIComponent(slug)}`);
});

// GET /:slug/view — serve gated HTML deck
router.get('/:slug/view', async (req, res) => {
  const { slug } = req.params;
  const proposal = PROPOSALS[slug];
  if (!proposal) return res.status(404).send('Proposal not found');
  if (!isAuthorized(req, slug)) return res.redirect(`/proposals/${encodeURIComponent(slug)}`);

  try {
    const html = await readFile(proposal.htmlPath, 'utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.status(200).type('html').send(injectOverlay(html, slug));
  } catch (err) {
    console.error('Error serving proposal HTML:', err.message);
    res.status(500).send('Unable to load proposal.');
  }
});

// GET /:slug/download — serve gated PDF
router.get('/:slug/download', async (req, res) => {
  const { slug } = req.params;
  const proposal = PROPOSALS[slug];
  if (!proposal) return res.status(404).send('Proposal not found');
  if (!isAuthorized(req, slug)) return res.redirect(`/proposals/${encodeURIComponent(slug)}`);

  if (!existsSync(proposal.pdfPath)) {
    return res.status(404).send('PDF not available.');
  }

  try {
    const { size } = await stat(proposal.pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', `attachment; filename="${proposal.downloadName}"`);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'private, no-store');
    createReadStream(proposal.pdfPath).pipe(res);
  } catch (err) {
    console.error('Error serving proposal PDF:', err.message);
    res.status(500).send('Unable to load PDF.');
  }
});

export default router;
