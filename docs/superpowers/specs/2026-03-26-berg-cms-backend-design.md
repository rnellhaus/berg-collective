# BERG Collective CMS Backend — Design Spec

## Overview

A custom CMS backend that allows a small team (2-5 people) to edit the BERG Collective website content, manage events with photo galleries, upload and auto-optimize images to WebP, and configure RSVP links that open in branded lightbox modals.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend tech | Node.js + Express | Same JS ecosystem as React frontend |
| Database | SQLite (via better-sqlite3) | Zero-config, single-file backup, sufficient for small team |
| Image storage | Local filesystem | Simple, works on VPS/HostGator hosting |
| Image optimization | Sharp → WebP | Fast, mature Node library, 3 output sizes |
| Auth | JWT (access + refresh tokens) | Stateless, works well with React SPA |
| Roles | Admin + Editor | Two-tier: Editors can't manage users or settings |
| Content editing | Field-based | Locked layouts, editors fill defined fields per section |
| RSVP approach | Hybrid lightbox | Lu.ma native overlay, iframe for embeddable sites, new-tab fallback |

---

## 1. System Architecture

```
berg-react/
  server/                        # Express backend
    index.js                     # Server entry, middleware setup
    db/
      schema.sql                 # SQLite schema
      seed.js                    # Initial data seeding from current content
      connection.js              # Database connection singleton
    routes/
      auth.js                    # POST /api/auth/login, /api/auth/refresh
      pages.js                   # GET/PUT /api/pages/:slug, /api/pages/:slug/sections/:key
      events.js                  # CRUD /api/events, /api/events/:id
      media.js                   # POST /api/media/upload, GET /api/media, DELETE /api/media/:id
      users.js                   # CRUD /api/users (Admin only)
    middleware/
      auth.js                    # JWT verification middleware
      roles.js                   # Role-based access control
      upload.js                  # Multer config for image uploads
    services/
      imageProcessor.js          # Sharp: resize + WebP conversion pipeline
    uploads/                     # Original uploaded files (gitignored)
    optimized/                   # WebP variants: thumb/, medium/, full/ (gitignored)
    berg.db                      # SQLite database file (gitignored)
  src/                           # Existing React frontend
    admin/                       # Admin SPA (behind /admin route)
      AdminApp.jsx               # Admin router and layout
      components/
        AdminLayout.jsx          # Sidebar + topbar shell
        AdminSidebar.jsx         # Navigation sidebar
        FieldEditor.jsx          # Generic field editor (text, textarea, image picker)
        ImagePicker.jsx          # Media library browser + uploader
        RsvpConfig.jsx           # RSVP platform selector + config fields
        PhotoGalleryManager.jsx  # Drag-to-reorder photo gallery editor
      pages/
        LoginPage.jsx            # Auth login form
        DashboardPage.jsx        # Overview / quick stats
        PagesListPage.jsx        # List of editable pages
        PageEditorPage.jsx       # Field-based page section editor
        EventsListPage.jsx       # Events list (upcoming/past tabs)
        EventEditorPage.jsx      # Event form with RSVP config + gallery
        MediaLibraryPage.jsx     # Grid view, search, filter, upload
        UsersPage.jsx            # User management (Admin only)
      hooks/
        useAuth.js               # Auth context, login/logout, token refresh
        useApi.js                # Fetch wrapper with auth headers
      context/
        AuthContext.jsx           # Auth state provider
    components/
      RsvpLightbox/              # Public-facing RSVP modal
        RsvpLightbox.jsx
        RsvpLightbox.module.css
      PhotoGallery/              # Public-facing photo gallery lightbox
        PhotoGallery.jsx
        PhotoGallery.module.css
      OptimizedImage/            # <picture> wrapper with WebP + fallback
        OptimizedImage.jsx
```

---

## 2. Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| email | TEXT UNIQUE | Login identifier |
| password_hash | TEXT | bcrypt hashed |
| name | TEXT | Display name |
| role | TEXT | 'admin' or 'editor' |
| created_at | TEXT | ISO timestamp |

### pages
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| slug | TEXT UNIQUE | e.g. 'home', 'about', 'programs' |
| title | TEXT | Page display name |
| meta_description | TEXT | SEO meta tag |
| updated_at | TEXT | Last edit timestamp |
| updated_by | INTEGER FK | → users.id |

### page_sections
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| page_id | INTEGER FK | → pages.id |
| section_key | TEXT | e.g. 'hero', 'mission', 'stats' |
| fields | TEXT (JSON) | JSON blob of field values |
| sort_order | INTEGER | Section ordering |

Example `fields` JSON for a hero section:
```json
{
  "badge_text": "Now accepting members",
  "headline": "Empowering Black Professionals to **Lead and Thrive**",
  "subtitle": "A collective dedicated to...",
  "hero_image_id": 12,
  "primary_btn_text": "Join the Collective",
  "primary_btn_link": "/join",
  "secondary_btn_text": "View Programs",
  "secondary_btn_link": "/programs"
}
```

### events
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| title | TEXT | Event name |
| description | TEXT | Short description |
| date | TEXT | ISO date string |
| time | TEXT | e.g. '6:00 PM' |
| location | TEXT | City / venue |
| category | TEXT | e.g. 'Networking', 'Finance', 'Workshop' |
| chapter | TEXT | e.g. 'atlanta', 'nyc', 'la' |
| cover_image_id | INTEGER FK | → media.id (nullable) |
| rsvp_platform | TEXT | 'luma', 'eventbrite', 'google_form', 'custom' |
| rsvp_url | TEXT | External registration URL |
| rsvp_event_id | TEXT | Platform-specific ID (e.g. Lu.ma evt-xxx) |
| is_featured | INTEGER | 0 or 1 |
| status | TEXT | 'upcoming' or 'past' |
| created_at | TEXT | ISO timestamp |
| updated_by | INTEGER FK | → users.id |

### event_photos
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| event_id | INTEGER FK | → events.id |
| media_id | INTEGER FK | → media.id |
| caption | TEXT | Optional photo caption |
| sort_order | INTEGER | Gallery ordering |

### media
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| filename | TEXT | Original filename |
| original_path | TEXT | Path to original upload |
| webp_thumb | TEXT | Path to 200px WebP thumbnail |
| webp_medium | TEXT | Path to 800px WebP |
| webp_full | TEXT | Path to 1600px WebP |
| jpg_fallback | TEXT | Path to 1600px JPG fallback |
| width | INTEGER | Original width |
| height | INTEGER | Original height |
| size_bytes | INTEGER | Original file size |
| webp_size_bytes | INTEGER | Full WebP file size (for savings display) |
| alt_text | TEXT | Accessibility alt text |
| category | TEXT | 'page', 'event', 'general' |
| uploaded_at | TEXT | ISO timestamp |
| uploaded_by | INTEGER FK | → users.id |

---

## 3. Image Processing Pipeline

When an image is uploaded via `POST /api/media/upload`:

1. **Validate**: Accept JPG, PNG, HEIC, WebP. Max 10MB.
2. **Store original**: Save to `server/uploads/{timestamp}-{filename}`
3. **Process with Sharp**: Generate 4 variants:
   - `thumb` — 200px wide, WebP, quality 80
   - `medium` — 800px wide, WebP, quality 82
   - `full` — 1600px wide, WebP, quality 85
   - `fallback` — 1600px wide, JPG, quality 80 (for browsers without WebP)
4. **Save variants** to `server/optimized/{thumb|medium|full|fallback}/{id}-{filename}.{ext}`
5. **Record in database**: Store all paths, dimensions, file sizes
6. **Return**: Media object with all variant URLs

### OptimizedImage Component

Public-facing React component that renders `<picture>` with WebP source and JPG fallback:

```jsx
<OptimizedImage
  media={imageData}
  size="medium"        // thumb | medium | full
  alt="Event photo"
  width={800}
  height={600}
  loading="lazy"
/>
```

Renders:
```html
<picture>
  <source srcset="/api/media/file/medium/12-photo.webp" type="image/webp" />
  <img src="/api/media/file/fallback/12-photo.jpg" alt="Event photo"
       width="800" height="600" loading="lazy" />
</picture>
```

---

## 4. API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | None | Email + password → JWT tokens |
| POST | /api/auth/refresh | Refresh token | Get new access token |

Access tokens expire in 15 minutes. Refresh tokens expire in 7 days. Stored in httpOnly cookies.

### Pages
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/pages | None | List all pages (public, for frontend) |
| GET | /api/pages/:slug | None | Get page with all sections |
| PUT | /api/pages/:slug/sections/:key | Editor+ | Update section fields |
| PUT | /api/pages/:slug/meta | Editor+ | Update page title/meta |

### Events
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/events | None | List events (filterable: status, chapter) |
| GET | /api/events/:id | None | Get single event with photos |
| POST | /api/events | Editor+ | Create event |
| PUT | /api/events/:id | Editor+ | Update event |
| DELETE | /api/events/:id | Admin | Delete event |
| POST | /api/events/:id/photos | Editor+ | Add photos to event gallery |
| PUT | /api/events/:id/photos/reorder | Editor+ | Reorder gallery photos |
| DELETE | /api/events/:id/photos/:photoId | Editor+ | Remove photo from gallery |

### Media
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/media | Editor+ | List all media (searchable, filterable) |
| POST | /api/media/upload | Editor+ | Upload + auto-optimize image |
| PUT | /api/media/:id | Editor+ | Update alt text, category |
| DELETE | /api/media/:id | Admin | Delete image and all variants |
| GET | /api/media/file/:size/:filename | None | Serve optimized image file |

### Users (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/users | Admin | List all users |
| POST | /api/users | Admin | Create user |
| PUT | /api/users/:id | Admin | Update user role/name |
| DELETE | /api/users/:id | Admin | Delete user |

---

## 5. Admin Dashboard

### Layout
- **Top bar**: BERG logo + CMS badge, "View Live Site" link, user avatar + name
- **Sidebar**: Pages, Events, Media Library (all roles) | Users, Settings (Admin only)
- **Main area**: Content for selected section

### Pages Editor
- Left: list of pages (Home, About, Programs, Chapters, Events, Impact, Donate, Join, Contact)
- Right: section tabs for selected page (e.g. Hero, Mission, Stats, Programs, Chapters, CTA for Home)
- Each section shows its editable fields: text inputs, textareas, image pickers, link fields
- **Image picker**: Opens media library modal — browse existing, search, or upload new
- **Save button**: Saves section changes via `PUT /api/pages/:slug/sections/:key`
- **Preview button**: Opens the public page in a new tab

### Events Manager
- **List view**: Upcoming/Past tabs, each row shows date badge, title, location, RSVP platform, photo count, Edit/Gallery buttons
- **Event editor form**: Title, date/time, location, category, chapter, description, cover image picker, featured toggle
- **RSVP config panel**: Platform selector (Lu.ma, Eventbrite, Google Form, Custom URL), platform-specific fields (event ID for Lu.ma, URL for others), smart hint showing which lightbox strategy will be used
- **Gallery manager**: Drag-to-reorder grid of photos, add from media library or upload new, captions, remove

### Media Library
- **Grid view**: Thumbnail grid with filename overlay
- **Search**: By filename
- **Filter**: All Images, Events, Pages, Unused
- **Upload**: Multi-file upload with progress indicator
- **Stats**: Total images count, total WebP savings in MB
- **Detail view**: Click image to see all sizes, alt text editor, usage (which pages/events reference it)

### Users (Admin only)
- List of team members with name, email, role, last login
- Add user form: name, email, password, role selector
- Edit/delete existing users

---

## 6. RSVP Lightbox System

### RsvpLightbox Component

A React modal that opens when a user clicks an RSVP button on the events page. Platform-aware with three strategies:

**Strategy 1 — Lu.ma Native Overlay** (best UX)
- When `rsvp_platform === 'luma'` and `rsvp_event_id` is set
- Uses Lu.ma's checkout overlay API: `data-luma-action="checkout"` with `data-luma-event-id`
- No iframe, native overlay from Lu.ma's script
- Falls back to Strategy 3 if script fails to load

**Strategy 2 — Iframe Lightbox**
- When `rsvp_platform` is 'google_form' or 'custom' (sites that allow iframe embedding)
- Opens branded modal with BERG header (event title, platform indicator, close button)
- Iframe loads the registration URL inside the modal
- Footer shows "Secure connection" badge + "Open in new tab" fallback link
- 5-second timeout: if iframe fails to load, automatically switches to Strategy 3

**Strategy 3 — Smart Fallback**
- When `rsvp_platform === 'eventbrite'` or iframe fails
- Opens the URL in a new tab
- Brief branded toast notification: "Opening registration in a new tab..."

### Platform Detection
The event editor lets the admin select the platform, which determines the strategy automatically. The events API returns `rsvp_strategy` ('overlay', 'iframe', 'external') computed from the platform field.

---

## 7. Photo Gallery Lightbox

### PhotoGallery Component

Public-facing lightbox for browsing past event photos:

- **Trigger**: "View Gallery" button on past event cards
- **Full-screen overlay**: Dark background, centered image (WebP optimized, medium size for initial load, full size on zoom)
- **Navigation**: Left/right arrow buttons + keyboard arrow keys + swipe on mobile
- **Header**: Event title, photo counter ("3 of 11"), close button
- **Thumbnail strip**: Bottom row of small thumbnails, current photo highlighted
- **Preloading**: Preloads next/prev images for instant navigation
- **Keyboard**: Escape to close, left/right arrows, swipe gestures on touch
- **URL sync**: Updates URL hash (#gallery-3) so users can share/bookmark specific photos

---

## 8. Frontend Integration

The existing React pages need to be modified to fetch content from the API instead of having it hardcoded:

### Content Loading Pattern
Each page component will:
1. Call `GET /api/pages/:slug` on mount
2. Receive section data with field values + media references
3. Render using the same components but with dynamic data
4. Show skeleton loading states while fetching

### Events Page Enhancement
The events page replaces the current static content + Lu.ma embed with:
1. Featured event card (from API, `is_featured: true`)
2. Upcoming events list (filterable by chapter)
3. Past events with photo gallery previews
4. RSVP buttons that trigger the appropriate lightbox strategy

### OptimizedImage Usage
All existing `<img>` tags across the site will be replaced with `<OptimizedImage>` to serve WebP with JPG fallback, proper width/height attributes to prevent layout shift, and lazy loading.

---

## 9. Data Seeding

A seed script (`server/db/seed.js`) will:
1. Create the initial Admin user (Rich, admin role)
2. Parse the current hardcoded content from each React page component
3. Insert it as page_sections records with the appropriate field JSON
4. Process the existing 57 photos through the image pipeline
5. Create media records for all processed images

This ensures the site works identically after the migration — content comes from the DB but looks exactly the same.

---

## 10. Security

- **Password hashing**: bcrypt with 12 rounds
- **JWT**: httpOnly cookies, SameSite=Strict, Secure flag in production
- **CSRF**: Double-submit cookie pattern
- **Upload validation**: File type checking (magic bytes, not just extension), 10MB limit
- **Rate limiting**: 5 login attempts per minute per IP
- **Input sanitization**: All text inputs sanitized before storage
- **Admin routes**: Protected by role middleware, Editor cannot access /api/users

---

## 11. Deployment

The project runs as a single Node.js process serving:
- Static React build (`dist/`) on all non-API routes
- Express API on `/api/*` routes
- Optimized images on `/api/media/file/*` routes
- Admin SPA on `/admin/*` (served from the same React build, client-side routed)

Build command: `npm run build` builds React, then `node server/index.js` starts everything.

SQLite database and uploaded images persist on the server filesystem. Backup = copy `berg.db` + `uploads/` + `optimized/` directories.
