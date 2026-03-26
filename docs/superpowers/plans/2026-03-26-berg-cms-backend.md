# BERG CMS Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom CMS backend with Express + SQLite that lets a small team edit page content, manage events with photo galleries, auto-optimize images to WebP, and open RSVP links in branded lightbox modals.

**Architecture:** Express API server with SQLite (better-sqlite3), Sharp image processing, JWT auth with httpOnly cookies. Admin dashboard as a React SPA under /admin. Public frontend fetches dynamic content from the API. Single Node process serves everything.

**Tech Stack:** Express, better-sqlite3, Sharp, bcrypt, jsonwebtoken, multer, React 19, React Router v7, Vite, CSS Modules

**Spec:** `docs/superpowers/specs/2026-03-26-berg-cms-backend-design.md`

---

## Phase 1: Server Foundation

### Task 1: Install server dependencies and create entry point

**Files:**
- Modify: `package.json`
- Create: `server/index.js`
- Create: `.gitignore` updates

- [ ] **Step 1: Install server dependencies**

```bash
cd "/Users/rnellhaus/Local Sites/berg-react"
npm install express better-sqlite3 sharp bcryptjs jsonwebtoken multer cookie-parser cors express-rate-limit
npm install -D concurrently nodemon
```

- [ ] **Step 2: Add server scripts to package.json**

Add to the `"scripts"` section:
```json
"server": "nodemon server/index.js",
"dev:full": "concurrently \"npm run dev\" \"npm run server\"",
"start": "node server/index.js"
```

- [ ] **Step 3: Update .gitignore**

Append to `.gitignore`:
```
server/uploads/
server/optimized/
server/berg.db
.superpowers/
```

- [ ] **Step 4: Create server/index.js**

```js
// server/index.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`BERG CMS server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Verify server starts**

```bash
cd "/Users/rnellhaus/Local Sites/berg-react"
node server/index.js &
sleep 1
curl -s http://localhost:3001/api/health
kill %1
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json server/index.js .gitignore
git commit -m "feat: add Express server entry point with health check endpoint"
```

---

### Task 2: Database schema and connection

**Files:**
- Create: `server/db/connection.js`
- Create: `server/db/schema.sql`
- Create: `server/db/init.js`

- [ ] **Step 1: Create server/db/schema.sql**

```sql
-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'editor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS page_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(page_id, section_key)
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  webp_thumb TEXT,
  webp_medium TEXT,
  webp_full TEXT,
  jpg_fallback TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  webp_size_bytes INTEGER,
  alt_text TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  category TEXT DEFAULT '',
  chapter TEXT DEFAULT '',
  cover_image_id INTEGER REFERENCES media(id),
  rsvp_platform TEXT DEFAULT 'custom',
  rsvp_url TEXT DEFAULT '',
  rsvp_event_id TEXT DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'past')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS event_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id),
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Create server/db/connection.js**

```js
// server/db/connection.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'berg.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
```

- [ ] **Step 3: Create server/db/init.js**

```js
// server/db/init.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDatabase() {
  const db = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Create upload directories
  const serverDir = path.join(__dirname, '..');
  const dirs = [
    path.join(serverDir, 'uploads'),
    path.join(serverDir, 'optimized', 'thumb'),
    path.join(serverDir, 'optimized', 'medium'),
    path.join(serverDir, 'optimized', 'full'),
    path.join(serverDir, 'optimized', 'fallback'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Database initialized');
}
```

- [ ] **Step 4: Wire init into server/index.js**

Add after imports:
```js
import { initDatabase } from './db/init.js';
initDatabase();
```

- [ ] **Step 5: Verify database initializes**

```bash
node server/index.js &
sleep 1
curl -s http://localhost:3001/api/health
kill %1
ls server/berg.db
```

Expected: health check responds, `berg.db` file exists.

- [ ] **Step 6: Commit**

```bash
git add server/db/
git commit -m "feat: add SQLite schema, connection, and database initialization"
```

---

### Task 3: Auth middleware and login route

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/middleware/roles.js`
- Create: `server/routes/auth.js`

- [ ] **Step 1: Create server/middleware/auth.js**

```js
// server/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'berg-cms-dev-secret-change-in-production';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

export function verifyToken(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export { JWT_SECRET };
```

- [ ] **Step 2: Create server/middleware/roles.js**

```js
// server/middleware/roles.js
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // 'editor' role means editor OR admin
    next();
  };
}
```

- [ ] **Step 3: Create server/routes/auth.js**

```js
// server/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db/connection.js';
import { generateTokens, verifyRefreshToken, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
```

- [ ] **Step 4: Mount auth routes in server/index.js**

Add after middleware:
```js
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);
```

- [ ] **Step 5: Create a test admin user via a temporary seed**

Add to `server/db/init.js` after schema exec:
```js
import bcrypt from 'bcryptjs';

// inside initDatabase(), after schema exec:
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('rich@bergcollective.org');
if (!existingAdmin) {
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    'rich@bergcollective.org', hash, 'Rich Nellhaus', 'admin'
  );
  console.log('Created default admin user: rich@bergcollective.org');
}
```

- [ ] **Step 6: Verify login works**

```bash
node server/index.js &
sleep 1
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rich@bergcollective.org","password":"admin123"}'
kill %1
```

Expected: `{"user":{"id":1,"name":"Rich Nellhaus","email":"rich@bergcollective.org","role":"admin"}}`

- [ ] **Step 7: Commit**

```bash
git add server/middleware/ server/routes/auth.js server/db/init.js
git commit -m "feat: add JWT auth with login, refresh, logout, and rate limiting"
```

---

### Task 4: Image processing service

**Files:**
- Create: `server/services/imageProcessor.js`
- Create: `server/middleware/upload.js`

- [ ] **Step 1: Create server/middleware/upload.js**

```js
// server/middleware/upload.js
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WebP, and HEIC images are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

- [ ] **Step 2: Create server/services/imageProcessor.js**

```js
// server/services/imageProcessor.js
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optimizedDir = path.join(__dirname, '..', 'optimized');

const SIZES = {
  thumb: { width: 200, quality: 80 },
  medium: { width: 800, quality: 82 },
  full: { width: 1600, quality: 85 },
};

export async function processImage(originalPath, mediaId, filename) {
  const baseName = path.parse(filename).name;
  const metadata = await sharp(originalPath).metadata();
  const results = {};

  // Generate WebP variants
  for (const [size, config] of Object.entries(SIZES)) {
    const outName = `${mediaId}-${baseName}.webp`;
    const outPath = path.join(optimizedDir, size, outName);

    await sharp(originalPath)
      .resize({ width: config.width, withoutEnlargement: true })
      .webp({ quality: config.quality })
      .toFile(outPath);

    results[`webp_${size}`] = `${size}/${outName}`;
  }

  // Generate JPG fallback at full size
  const fallbackName = `${mediaId}-${baseName}.jpg`;
  const fallbackPath = path.join(optimizedDir, 'fallback', fallbackName);

  await sharp(originalPath)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(fallbackPath);

  results.jpg_fallback = `fallback/${fallbackName}`;

  // Get file sizes for stats
  const fullWebpPath = path.join(optimizedDir, results.webp_full);
  const webpStats = fs.statSync(fullWebpPath);
  const originalStats = fs.statSync(originalPath);

  return {
    ...results,
    width: metadata.width,
    height: metadata.height,
    size_bytes: originalStats.size,
    webp_size_bytes: webpStats.size,
  };
}
```

- [ ] **Step 3: Verify Sharp works with a test image**

```bash
cd "/Users/rnellhaus/Local Sites/berg-react"
node -e "
import sharp from 'sharp';
const info = await sharp('public/images/photos/rich-headshot-new.jpg').metadata();
console.log('Width:', info.width, 'Height:', info.height, 'Format:', info.format);
"
```

Expected: Image dimensions and format printed.

- [ ] **Step 4: Commit**

```bash
git add server/middleware/upload.js server/services/imageProcessor.js
git commit -m "feat: add image upload middleware and Sharp WebP processing pipeline"
```

---

## Phase 2: API Routes

### Task 5: Media API routes

**Files:**
- Create: `server/routes/media.js`
- Modify: `server/index.js` (mount routes)

- [ ] **Step 1: Create server/routes/media.js**

```js
// server/routes/media.js
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../middleware/upload.js';
import { processImage } from '../services/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /api/media - List all media
router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  const { search, category } = req.query;

  let query = 'SELECT * FROM media';
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('filename LIKE ?');
    params.push(`%${search}%`);
  }
  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY uploaded_at DESC';

  const media = db.prepare(query).all(...params);
  const totalSavings = db.prepare(
    'SELECT SUM(size_bytes - webp_size_bytes) as saved FROM media WHERE webp_size_bytes IS NOT NULL'
  ).get();

  res.json({ media, totalSavings: totalSavings.saved || 0 });
});

// POST /api/media/upload - Upload and process image
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const db = getDb();

    // Insert placeholder to get ID
    const result = db.prepare(
      'INSERT INTO media (filename, original_path, uploaded_by) VALUES (?, ?, ?)'
    ).run(req.file.originalname, req.file.path, req.user.id);

    const mediaId = result.lastInsertRowid;

    // Process image
    const processed = await processImage(req.file.path, mediaId, req.file.originalname);

    // Update with processed paths
    db.prepare(`
      UPDATE media SET
        webp_thumb = ?, webp_medium = ?, webp_full = ?, jpg_fallback = ?,
        width = ?, height = ?, size_bytes = ?, webp_size_bytes = ?,
        category = ?
      WHERE id = ?
    `).run(
      processed.webp_thumb, processed.webp_medium, processed.webp_full, processed.jpg_fallback,
      processed.width, processed.height, processed.size_bytes, processed.webp_size_bytes,
      req.body.category || 'general',
      mediaId
    );

    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    res.status(201).json({ media });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// PUT /api/media/:id - Update alt text, category
router.put('/:id', verifyToken, (req, res) => {
  const db = getDb();
  const { alt_text, category } = req.body;
  db.prepare('UPDATE media SET alt_text = ?, category = ? WHERE id = ?').run(
    alt_text || '', category || 'general', req.params.id
  );
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  res.json({ media });
});

// DELETE /api/media/:id - Delete image and variants (Admin only)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Media not found' });

  // Delete files
  const optimizedBase = path.join(__dirname, '..', 'optimized');
  const filesToDelete = [
    media.original_path,
    media.webp_thumb ? path.join(optimizedBase, media.webp_thumb) : null,
    media.webp_medium ? path.join(optimizedBase, media.webp_medium) : null,
    media.webp_full ? path.join(optimizedBase, media.webp_full) : null,
    media.jpg_fallback ? path.join(optimizedBase, media.jpg_fallback) : null,
  ].filter(Boolean);

  for (const f of filesToDelete) {
    try { fs.unlinkSync(f); } catch {}
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// GET /api/media/file/:size/:filename - Serve optimized image (public)
router.get('/file/:size/:filename', (req, res) => {
  const { size, filename } = req.params;
  const validSizes = ['thumb', 'medium', 'full', 'fallback'];
  if (!validSizes.includes(size)) {
    return res.status(400).json({ error: 'Invalid size' });
  }

  const filePath = path.join(__dirname, '..', 'optimized', size, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.webp' ? 'image/webp' : 'image/jpeg';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
```

- [ ] **Step 2: Mount in server/index.js**

```js
import mediaRoutes from './routes/media.js';
app.use('/api/media', mediaRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/media.js server/index.js
git commit -m "feat: add media API with upload, WebP processing, and file serving"
```

---

### Task 6: Pages API routes

**Files:**
- Create: `server/routes/pages.js`
- Modify: `server/index.js` (mount routes)

- [ ] **Step 1: Create server/routes/pages.js**

```js
// server/routes/pages.js
import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET /api/pages - List all pages (public)
router.get('/', (req, res) => {
  const db = getDb();
  const pages = db.prepare('SELECT id, slug, title, meta_description, updated_at FROM pages ORDER BY id').all();
  res.json({ pages });
});

// GET /api/pages/:slug - Get page with all sections (public)
router.get('/:slug', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const sections = db.prepare(
    'SELECT id, section_key, fields, sort_order FROM page_sections WHERE page_id = ? ORDER BY sort_order'
  ).all(page.id);

  // Parse JSON fields
  const parsedSections = sections.map(s => ({
    ...s,
    fields: JSON.parse(s.fields),
  }));

  res.json({ page, sections: parsedSections });
});

// PUT /api/pages/:slug/sections/:key - Update section fields (auth required)
router.put('/:slug/sections/:key', verifyToken, (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const { fields } = req.body;
  if (!fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'Fields object required' });
  }

  const existing = db.prepare(
    'SELECT * FROM page_sections WHERE page_id = ? AND section_key = ?'
  ).get(page.id, req.params.key);

  if (existing) {
    db.prepare('UPDATE page_sections SET fields = ? WHERE id = ?').run(
      JSON.stringify(fields), existing.id
    );
  } else {
    db.prepare(
      'INSERT INTO page_sections (page_id, section_key, fields, sort_order) VALUES (?, ?, ?, ?)'
    ).run(page.id, req.params.key, JSON.stringify(fields), 0);
  }

  db.prepare('UPDATE pages SET updated_at = datetime("now"), updated_by = ? WHERE id = ?').run(
    req.user.id, page.id
  );

  res.json({ message: 'Section updated' });
});

// PUT /api/pages/:slug/meta - Update page meta (auth required)
router.put('/:slug/meta', verifyToken, (req, res) => {
  const db = getDb();
  const { title, meta_description } = req.body;

  const result = db.prepare(
    'UPDATE pages SET title = ?, meta_description = ?, updated_at = datetime("now"), updated_by = ? WHERE slug = ?'
  ).run(title, meta_description, req.user.id, req.params.slug);

  if (result.changes === 0) return res.status(404).json({ error: 'Page not found' });
  res.json({ message: 'Page meta updated' });
});

export default router;
```

- [ ] **Step 2: Mount in server/index.js**

```js
import pagesRoutes from './routes/pages.js';
app.use('/api/pages', pagesRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/pages.js server/index.js
git commit -m "feat: add pages API with public read and authenticated section editing"
```

---

### Task 7: Events API routes

**Files:**
- Create: `server/routes/events.js`
- Modify: `server/index.js` (mount routes)

- [ ] **Step 1: Create server/routes/events.js**

```js
// server/routes/events.js
import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

function getRsvpStrategy(platform) {
  if (platform === 'luma') return 'overlay';
  if (platform === 'eventbrite') return 'external';
  return 'iframe';
}

// GET /api/events - List events (public, filterable)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, chapter } = req.query;

  let query = 'SELECT e.*, m.webp_medium as cover_image_url FROM events e LEFT JOIN media m ON e.cover_image_id = m.id';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (chapter) {
    conditions.push('e.chapter = ?');
    params.push(chapter);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY e.date DESC';

  const events = db.prepare(query).all(...params).map(e => ({
    ...e,
    rsvp_strategy: getRsvpStrategy(e.rsvp_platform),
    photo_count: db.prepare('SELECT COUNT(*) as count FROM event_photos WHERE event_id = ?').get(e.id).count,
  }));

  res.json({ events });
});

// GET /api/events/:id - Get single event with photos (public)
router.get('/:id', (req, res) => {
  const db = getDb();
  const event = db.prepare(
    'SELECT e.*, m.webp_medium as cover_image_url FROM events e LEFT JOIN media m ON e.cover_image_id = m.id WHERE e.id = ?'
  ).get(req.params.id);

  if (!event) return res.status(404).json({ error: 'Event not found' });

  const photos = db.prepare(`
    SELECT ep.id, ep.caption, ep.sort_order,
           m.id as media_id, m.webp_thumb, m.webp_medium, m.webp_full, m.jpg_fallback, m.alt_text
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = ?
    ORDER BY ep.sort_order
  `).all(req.params.id);

  res.json({
    event: { ...event, rsvp_strategy: getRsvpStrategy(event.rsvp_platform) },
    photos,
  });
});

// POST /api/events - Create event
router.post('/', verifyToken, (req, res) => {
  const db = getDb();
  const { title, description, date, time, location, category, chapter,
          cover_image_id, rsvp_platform, rsvp_url, rsvp_event_id, is_featured, status } = req.body;

  const result = db.prepare(`
    INSERT INTO events (title, description, date, time, location, category, chapter,
      cover_image_id, rsvp_platform, rsvp_url, rsvp_event_id, is_featured, status, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', date, time || '', location || '', category || '',
    chapter || '', cover_image_id || null, rsvp_platform || 'custom', rsvp_url || '',
    rsvp_event_id || '', is_featured ? 1 : 0, status || 'upcoming', req.user.id);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ event });
});

// PUT /api/events/:id - Update event
router.put('/:id', verifyToken, (req, res) => {
  const db = getDb();
  const { title, description, date, time, location, category, chapter,
          cover_image_id, rsvp_platform, rsvp_url, rsvp_event_id, is_featured, status } = req.body;

  db.prepare(`
    UPDATE events SET title=?, description=?, date=?, time=?, location=?, category=?, chapter=?,
      cover_image_id=?, rsvp_platform=?, rsvp_url=?, rsvp_event_id=?, is_featured=?, status=?, updated_by=?
    WHERE id = ?
  `).run(title, description, date, time, location, category, chapter,
    cover_image_id || null, rsvp_platform, rsvp_url, rsvp_event_id,
    is_featured ? 1 : 0, status, req.user.id, req.params.id);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json({ event });
});

// DELETE /api/events/:id - Admin only
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Event deleted' });
});

// POST /api/events/:id/photos - Add photos to gallery
router.post('/:id/photos', verifyToken, (req, res) => {
  const db = getDb();
  const { media_ids } = req.body;
  if (!Array.isArray(media_ids)) return res.status(400).json({ error: 'media_ids array required' });

  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM event_photos WHERE event_id = ?'
  ).get(req.params.id);
  let order = (maxOrder.max || 0) + 1;

  const insert = db.prepare(
    'INSERT INTO event_photos (event_id, media_id, sort_order) VALUES (?, ?, ?)'
  );
  for (const mediaId of media_ids) {
    insert.run(req.params.id, mediaId, order++);
  }

  res.status(201).json({ message: `Added ${media_ids.length} photos` });
});

// PUT /api/events/:id/photos/reorder - Reorder gallery
router.put('/:id/photos/reorder', verifyToken, (req, res) => {
  const db = getDb();
  const { photo_ids } = req.body;
  if (!Array.isArray(photo_ids)) return res.status(400).json({ error: 'photo_ids array required' });

  const update = db.prepare('UPDATE event_photos SET sort_order = ? WHERE id = ?');
  photo_ids.forEach((id, index) => update.run(index, id));

  res.json({ message: 'Reordered' });
});

// DELETE /api/events/:id/photos/:photoId - Remove photo from gallery
router.delete('/:id/photos/:photoId', verifyToken, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM event_photos WHERE id = ? AND event_id = ?').run(
    req.params.photoId, req.params.id
  );
  res.json({ message: 'Photo removed from gallery' });
});

export default router;
```

- [ ] **Step 2: Mount in server/index.js**

```js
import eventsRoutes from './routes/events.js';
app.use('/api/events', eventsRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/events.js server/index.js
git commit -m "feat: add events API with CRUD, photo gallery, and RSVP strategy detection"
```

---

### Task 8: Users API routes

**Files:**
- Create: `server/routes/users.js`
- Modify: `server/index.js` (mount routes)

- [ ] **Step 1: Create server/routes/users.js**

```js
// server/routes/users.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// All routes require admin
router.use(verifyToken, requireRole('admin'));

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY id').all();
  res.json({ users });
});

// POST /api/users
router.post('/', (req, res) => {
  const db = getDb();
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name required' });
  }
  if (role && !['admin', 'editor'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or editor' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email, hash, name, role || 'editor');

  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, role, password } = req.body;
  const userId = parseInt(req.params.id);

  if (userId === req.user.id && role && role !== req.user.role) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  if (password) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  }
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const userId = parseInt(req.params.id);

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ message: 'User deleted' });
});

export default router;
```

- [ ] **Step 2: Mount in server/index.js**

```js
import usersRoutes from './routes/users.js';
app.use('/api/users', usersRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/users.js server/index.js
git commit -m "feat: add users API with admin-only CRUD and role management"
```

---

## Phase 3: Admin Dashboard

### Task 9: Admin auth context and hooks

**Files:**
- Create: `src/admin/context/AuthContext.jsx`
- Create: `src/admin/hooks/useAuth.js`
- Create: `src/admin/hooks/useApi.js`

- [ ] **Step 1: Create src/admin/context/AuthContext.jsx**

```jsx
// src/admin/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

const API_BASE = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Create src/admin/hooks/useAuth.js**

```js
// src/admin/hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create src/admin/hooks/useApi.js**

```js
// src/admin/hooks/useApi.js
const API_BASE = '/api';

export function useApi() {
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Try token refresh on 401
    if (res.status === 401 && !options._retried) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        return apiFetch(path, { ...options, _retried: true });
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function uploadFile(path, file, extraFields = {}) {
    const formData = new FormData();
    formData.append('image', file);
    for (const [key, val] of Object.entries(extraFields)) {
      formData.append(key, val);
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error);
    }
    return res.json();
  }

  return { apiFetch, uploadFile };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/
git commit -m "feat: add admin auth context, useAuth, and useApi hooks"
```

---

### Task 10: Admin layout, login, and routing

**Files:**
- Create: `src/admin/AdminApp.jsx`
- Create: `src/admin/components/AdminLayout.jsx`
- Create: `src/admin/components/AdminLayout.module.css`
- Create: `src/admin/pages/LoginPage.jsx`
- Create: `src/admin/pages/LoginPage.module.css`
- Create: `src/admin/pages/DashboardPage.jsx`
- Modify: `src/App.jsx` (add /admin route)

This task creates the admin shell: login page, sidebar layout, dashboard. The implementation subagent should read the spec section 5 (Admin Dashboard) and the mockup descriptions for the dark top bar, sidebar nav, and breadcrumb layout.

- [ ] **Step 1: Create LoginPage** — form with email/password, error display, submit calls `useAuth().login()`, redirects to `/admin` on success. Styled with BERG brand colors.

- [ ] **Step 2: Create AdminLayout** — top bar (BERG CMS logo, View Live Site link, user avatar), sidebar (Pages, Events, Media Library for all; Users, Settings for admin only), main content area with `<Outlet />`. Styled per the mockup.

- [ ] **Step 3: Create AdminApp.jsx** — `AuthProvider` wrapper, routes: `/admin/login` → LoginPage, `/admin/*` → AdminLayout with nested routes (dashboard, pages, events, media, users). Redirect to login if not authenticated.

- [ ] **Step 4: Create DashboardPage** — simple overview showing total pages, events, media count, and recent activity. Fetches counts from the API.

- [ ] **Step 5: Add admin route to src/App.jsx**

Add a lazy-loaded route for the admin:
```jsx
const AdminApp = lazy(() => import('./admin/AdminApp'));
// In Routes:
<Route path="/admin/*" element={<AdminApp />} />
```

Remove Header/Footer wrapping for admin routes (admin has its own layout).

- [ ] **Step 6: Configure Vite proxy**

Add to `vite.config.js`:
```js
server: {
  proxy: {
    '/api': 'http://localhost:3001',
  },
}
```

- [ ] **Step 7: Verify admin login flow**

Start both servers with `npm run dev:full`. Navigate to `http://localhost:5173/admin`. Should redirect to login. Log in with `rich@bergcollective.org` / `admin123`. Should show dashboard.

- [ ] **Step 8: Commit**

```bash
git add src/admin/ src/App.jsx vite.config.js
git commit -m "feat: add admin login, layout shell, dashboard, and Vite proxy"
```

---

### Task 11: Pages editor admin page

**Files:**
- Create: `src/admin/pages/PagesListPage.jsx`
- Create: `src/admin/pages/PageEditorPage.jsx`
- Create: `src/admin/pages/PageEditorPage.module.css`
- Create: `src/admin/components/FieldEditor.jsx`
- Create: `src/admin/components/ImagePicker.jsx`
- Create: `src/admin/components/ImagePicker.module.css`

This task builds the page content editor with section tabs and field editing.

- [ ] **Step 1: Create PagesListPage** — fetches `/api/pages`, displays list of pages with slug, title, last updated. Each row links to `/admin/pages/:slug`.

- [ ] **Step 2: Create FieldEditor** — renders the appropriate input for each field type: text input for short text, textarea for body text, ImagePicker for image fields (detected by field name ending in `_image_id`), paired inputs for button text/link fields. Takes `fields` object and `onChange` callback.

- [ ] **Step 3: Create ImagePicker** — modal that shows media library grid, search, filter. Click an image to select it. "Upload New" button for inline upload. Returns selected media ID and thumbnail URL to parent. Uses `useApi().apiFetch('/media')` and `useApi().uploadFile('/media/upload', file)`.

- [ ] **Step 4: Create PageEditorPage** — fetches `/api/pages/:slug` on mount. Shows section tabs (hero, mission, stats, etc.). Active tab shows FieldEditor with that section's fields. Save button calls `PUT /api/pages/:slug/sections/:key`. Preview button opens public page in new tab. Breadcrumb shows "Pages / Home".

- [ ] **Step 5: Wire routes** — add `pages` and `pages/:slug` routes in AdminApp.

- [ ] **Step 6: Commit**

```bash
git add src/admin/
git commit -m "feat: add pages list, field-based page editor, and image picker"
```

---

### Task 12: Events manager admin pages

**Files:**
- Create: `src/admin/pages/EventsListPage.jsx`
- Create: `src/admin/pages/EventEditorPage.jsx`
- Create: `src/admin/pages/EventEditorPage.module.css`
- Create: `src/admin/components/RsvpConfig.jsx`
- Create: `src/admin/components/PhotoGalleryManager.jsx`
- Create: `src/admin/components/PhotoGalleryManager.module.css`

- [ ] **Step 1: Create EventsListPage** — upcoming/past tabs, list of events with date badge, title, location, platform, photo count, edit/gallery buttons. "+ New Event" button. Fetches from `/api/events?status=upcoming` and `/api/events?status=past`.

- [ ] **Step 2: Create RsvpConfig** — platform selector buttons (Lu.ma, Eventbrite, Google Form, Custom URL). Shows platform-specific fields: Lu.ma Event ID for luma, URL for others. Shows smart hint explaining which lightbox strategy will be used based on selected platform.

- [ ] **Step 3: Create PhotoGalleryManager** — grid of event photos. Add from media library or upload new. Drag to reorder (use simple click-to-move-up/down buttons instead of full drag-and-drop to keep it simple). Caption editing. Remove button. Uses `/api/events/:id/photos` endpoints.

- [ ] **Step 4: Create EventEditorPage** — form with all event fields (title, date, time, location, category, chapter, description, cover image, featured toggle). Includes RsvpConfig and PhotoGalleryManager as sections. Create mode (`/admin/events/new`) and edit mode (`/admin/events/:id`).

- [ ] **Step 5: Wire routes** — add events list and editor routes in AdminApp.

- [ ] **Step 6: Commit**

```bash
git add src/admin/
git commit -m "feat: add events manager with RSVP config and photo gallery editor"
```

---

### Task 13: Media library admin page

**Files:**
- Create: `src/admin/pages/MediaLibraryPage.jsx`
- Create: `src/admin/pages/MediaLibraryPage.module.css`

- [ ] **Step 1: Create MediaLibraryPage** — grid view of all images (thumbnail size). Search by filename. Filter by category (All, Events, Pages, Unused). Upload button triggers multi-file upload with progress. Stats bar shows total images and WebP savings. Click image opens detail panel showing all sizes, alt text editor, usage info, delete button (admin only). Uses `/api/media` endpoints.

- [ ] **Step 2: Wire route** in AdminApp.

- [ ] **Step 3: Commit**

```bash
git add src/admin/
git commit -m "feat: add media library with grid view, search, upload, and WebP stats"
```

---

### Task 14: Users management admin page

**Files:**
- Create: `src/admin/pages/UsersPage.jsx`
- Create: `src/admin/pages/UsersPage.module.css`

- [ ] **Step 1: Create UsersPage** — list of users with name, email, role, created date. "Add User" button opens inline form (name, email, password, role selector). Edit button allows changing name and role. Delete button with confirmation. Only shown for admin users. Uses `/api/users` endpoints.

- [ ] **Step 2: Wire route** in AdminApp (only accessible to admin role).

- [ ] **Step 3: Commit**

```bash
git add src/admin/
git commit -m "feat: add users management page for admin role"
```

---

## Phase 4: Public Frontend Integration

### Task 15: OptimizedImage component

**Files:**
- Create: `src/components/OptimizedImage/OptimizedImage.jsx`

- [ ] **Step 1: Create OptimizedImage component**

```jsx
// src/components/OptimizedImage/OptimizedImage.jsx
export default function OptimizedImage({ media, size = 'medium', alt, width, height, loading = 'lazy', className, style }) {
  if (!media) return null;

  const webpSrc = `/api/media/file/${size}/${media[`webp_${size}`]?.split('/').pop() || ''}`;
  const fallbackSrc = `/api/media/file/fallback/${media.jpg_fallback?.split('/').pop() || ''}`;

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={fallbackSrc}
        alt={alt || media.alt_text || ''}
        width={width}
        height={height}
        loading={loading}
        className={className}
        style={style}
      />
    </picture>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OptimizedImage/
git commit -m "feat: add OptimizedImage component with WebP and JPG fallback"
```

---

### Task 16: RSVP Lightbox component

**Files:**
- Create: `src/components/RsvpLightbox/RsvpLightbox.jsx`
- Create: `src/components/RsvpLightbox/RsvpLightbox.module.css`

- [ ] **Step 1: Create RsvpLightbox component**

Implements the 3-strategy hybrid:
- **overlay** (Lu.ma): Triggers Lu.ma's native checkout via `data-luma-action="checkout"` button click. Loads Lu.ma script if not already present.
- **iframe**: Branded modal with BERG header (event title, platform name, close button), iframe loading the registration URL, footer with "Secure connection" + "Open in new tab" link. 5-second load timeout → falls back to external.
- **external**: `window.open(url, '_blank')` + toast notification "Opening registration in a new tab..."

Props: `event` (with rsvp_strategy, rsvp_url, rsvp_event_id, rsvp_platform, title), `isOpen`, `onClose`.

Keyboard: Escape closes. Click outside modal closes. Focus trap inside modal for accessibility.

- [ ] **Step 2: Create CSS module** — full-screen overlay with dark backdrop, centered modal card (max-width 560px), BERG branded header, responsive.

- [ ] **Step 3: Commit**

```bash
git add src/components/RsvpLightbox/
git commit -m "feat: add RSVP lightbox with Lu.ma overlay, iframe, and fallback strategies"
```

---

### Task 17: Photo Gallery Lightbox component

**Files:**
- Create: `src/components/PhotoGallery/PhotoGallery.jsx`
- Create: `src/components/PhotoGallery/PhotoGallery.module.css`

- [ ] **Step 1: Create PhotoGallery component**

Full-screen gallery lightbox:
- Dark overlay background
- Centered image (using OptimizedImage, medium size, switches to full on click/zoom)
- Header: event title, "3 of 11" counter, close button
- Left/right navigation arrows
- Bottom thumbnail strip (thumb size)
- Keyboard: Escape closes, left/right arrows navigate
- Preloads next/prev images
- URL hash sync: `#gallery-3` for photo index

Props: `photos` array (media objects with webp_thumb, webp_medium, webp_full, jpg_fallback), `eventTitle`, `initialIndex`, `isOpen`, `onClose`.

- [ ] **Step 2: Create CSS module** — full-screen fixed overlay, image centering, nav arrows, thumbnail strip, responsive.

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoGallery/
git commit -m "feat: add photo gallery lightbox with keyboard nav and thumbnail strip"
```

---

### Task 18: Update Events page with dynamic content

**Files:**
- Modify: `src/pages/EventsPage/EventsPage.jsx`
- Modify: `src/pages/EventsPage/EventsPage.module.css`

- [ ] **Step 1: Refactor EventsPage to fetch from API**

Replace hardcoded events with:
1. Fetch featured event from `/api/events?status=upcoming` (find `is_featured: 1`)
2. Fetch upcoming events list from `/api/events?status=upcoming`
3. Fetch past events from `/api/events?status=past` (each with photo_count)
4. Chapter filter tabs that filter the upcoming list
5. RSVP buttons open RsvpLightbox with the event's strategy
6. Past events show photo gallery preview strip + "View Gallery" button that opens PhotoGallery
7. Skeleton loading states while fetching

- [ ] **Step 2: Update CSS module** with styles for event list rows, past event gallery strips, filter tabs.

- [ ] **Step 3: Commit**

```bash
git add src/pages/EventsPage/
git commit -m "feat: update events page with dynamic API content, RSVP lightbox, and photo gallery"
```

---

### Task 19: Data seeding script

**Files:**
- Create: `server/db/seed.js`

- [ ] **Step 1: Create seed script**

`server/db/seed.js` does:
1. Creates pages records for all 9 pages (home, about, programs, chapters, events, impact, donate, join, contact)
2. Creates page_sections records with field JSON extracted from the current hardcoded React content (headlines, subtitles, button text/links, etc.)
3. Processes all 57 photos from `public/images/photos/` through the image pipeline
4. Creates media records for each processed image
5. Creates a few sample events (upcoming + past) with cover images and photo galleries

Run with: `node server/db/seed.js`

The script should be idempotent — check if data exists before inserting.

- [ ] **Step 2: Run seed and verify**

```bash
node server/db/seed.js
node server/index.js &
sleep 1
curl -s http://localhost:3001/api/pages/home | head -5
curl -s http://localhost:3001/api/events | head -5
curl -s http://localhost:3001/api/media | head -5
kill %1
```

Expected: All endpoints return seeded data.

- [ ] **Step 3: Commit**

```bash
git add server/db/seed.js
git commit -m "feat: add data seeding script for pages, media, and sample events"
```

---

### Task 20: Update remaining pages for dynamic content + production build

**Files:**
- Modify: `src/pages/HomePage/HomePage.jsx`
- Modify: All other page components
- Modify: `server/index.js` (serve static files in production)

- [ ] **Step 1: Create a usePageContent hook**

```js
// src/hooks/usePageContent.js
import { useState, useEffect } from 'react';

export function usePageContent(slug) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pages/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const map = {};
        for (const s of data.sections) {
          map[s.section_key] = s.fields;
        }
        setSections(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return { sections, loading };
}
```

- [ ] **Step 2: Update HomePage** to use `usePageContent('home')` and render dynamic data from `sections.hero`, `sections.mission`, etc., falling back to current hardcoded values if the API is unavailable. Replace `<img>` tags with `<OptimizedImage>` where media IDs are available.

- [ ] **Step 3: Update remaining pages** (About, Programs, Chapters, Impact, Donate, Join, Contact) with the same pattern — fetch from API, fall back to hardcoded.

- [ ] **Step 4: Add static file serving for production** in server/index.js:

```js
// After all API routes, serve React build
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
```

- [ ] **Step 5: Test production build**

```bash
npm run build
NODE_ENV=production node server/index.js &
sleep 1
curl -s http://localhost:3001/ | head -3
curl -s http://localhost:3001/api/health
kill %1
```

Expected: React app serves on `/`, API responds on `/api/health`.

- [ ] **Step 6: Commit**

```bash
git add src/ server/
git commit -m "feat: connect all pages to CMS API with fallback and production static serving"
```
