# Deploying the AI Summit landing page (`/aisummit`)

The **Amplified Intelligence — BERG AI Summit 2026** landing page lives at
**https://bergcollective.org/aisummit**.

It was built as an **isolated React route** inside this existing app (per the chosen
approach), not as a separate static site. It renders its own deep-space chrome (nav +
footer) and does **not** use the main BERG `Navbar`/`FooterNew`, so it stays visually
self-contained while still deploying with the rest of the site.

## Where the code lives

| Thing | Path |
|---|---|
| Page component | `src/pages/AiSummitPage/AiSummitPage.jsx` |
| Styles (scoped) | `src/pages/AiSummitPage/AiSummitPage.module.css` |
| Route registration | `src/App.jsx` (top-level `/aisummit`, outside `PublicLayout`) |
| Brand/optimized images | `public/images/aisummit/` (+ `/speakers`) |
| Image optimizer (one-off) | `scripts/optimize-aisummit-images.js` |
| Font | `Space Grotesk` appended to the Google Fonts `@import` in `src/index.css` |

## How it serves at `/aisummit`

1. `/aisummit` is a React Router route. On a hard load, Vercel serves the **prerendered**
   `dist/aisummit/index.html` (added to `ROUTES` in `scripts/prerender.js`), so crawlers
   and social scrapers get full HTML + meta + JSON-LD `Event` schema without running JS.
2. Static files in `dist/` are matched **before** the SPA catch-all rewrite in
   `vercel.json` (`/((?!api/).*) → /index.html`), so the prerendered file wins.
3. React hydrates on the client and the canvas animation + scroll reveals + Luma checkout
   overlay activate.

## Deploy

No special steps — it ships with the normal pipeline:

```bash
npm run build      # vite build + postbuild prerender (writes dist/aisummit/index.html)
```

Push to the deploy branch and Vercel builds/deploys as usual. Verify afterward:

- `https://bergcollective.org/aisummit` loads the dark page (not the main site).
- Registration: clicking any **Register / Reserve Your Spot** button opens the Luma
  checkout overlay; the inline iframe in the **Register** section shows the full form.

> **Note on `www`:** the brief referenced `www.bergcollective.org/aisummit`, but
> `vercel.json` 301-redirects `www` → the apex domain. The canonical, working URL is
> **`https://bergcollective.org/aisummit`** (set as `<link rel="canonical">` and `og:url`).

## Swapping in the real Luma `evt-` id

The page currently uses the **short-code fallback** (`qw6m5bzv`), which works today. When
Luma's **Share → Embed → "Embed on your website"** dialog gives you the `evt-…` id, update
**`src/pages/AiSummitPage/AiSummitPage.jsx`**:

- `LUMA_EMBED_SRC` → `https://lu.ma/embed/event/evt-XXXXXXXX/simple`
- (optional) add `data-luma-event-id="evt-XXXXXXXX"` to the four `luma-checkout--button`
  anchors (nav, hero, register, footer).

No other change needed. Rebuild and redeploy.

## Re-optimizing images

If brand art or headshots change, drop new files into `public/images/AI Summit/`, map any
new speaker in the script, then:

```bash
node scripts/optimize-aisummit-images.js   # regenerates public/images/aisummit/**
```

Outputs (square face-aware webp speakers, compressed OG jpg, hero lockup webp) are
committed so the build never depends on the script at deploy time.

## (Not chosen) Squarespace / standalone hosting

The brief's alternative — a fully portable static `index.html` to paste into Squarespace —
was **not** the selected path. If that's ever needed, the page is straightforward to port:
it has no server dependencies, and the Luma **iframe embed** is the most reliable method
inside Squarespace Code Blocks (which sanitize some markup).

---

## Outstanding TODOs

1. **Luma `evt-` id** — replace the short-code fallback (`qw6m5bzv`) with the exact
   `evt-…` embed id once available. See "Swapping in the real Luma `evt-` id" above.
   (Marked with a `TODO` comment in `AiSummitPage.jsx`.)
2. **Marcus Ellison headshot** — no source image exists, so he currently renders as a
   gradient **"ME"** initials tile. Add `marcus-ellison` art to the AI Summit folder, map
   it in `scripts/optimize-aisummit-images.js`, re-run, and set `img: 'marcus-ellison'`
   in the `SPEAKERS` array.
3. **Afterparty location** — the 5:30 PM "Reception & Afterparty" line says *Location TBD*.
   Update `SCHEDULE` once confirmed.
4. **Tunde Ajaba-Ogundipe title** — no title was provided; currently labeled "Speaker".
   Update the `SPEAKERS` array when known.
5. **OG image (optional)** — currently the 1200×1200 square key art
   (`og-amplified-intelligence.jpg`). If a 1.91:1 (1200×630) crop is preferred for link
   previews, export one and point `OG_IMAGE` + `og:image:width/height` at it.
6. **`apple-touch-icon`** — generated as a 180×180 PNG from the "Ai" monogram SVG. Swap in
   an official monogram PNG here and at `public/images/aisummit/ai-monogram.svg` if brand
   provides one.
