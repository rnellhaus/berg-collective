import { initDatabase } from './init.js';
import { getDb } from './connection.js';
import { processImage } from '../services/imageProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(__dirname, '..', '..', 'public', 'images', 'photos');

// Initialize DB and directories first
initDatabase();
const db = getDb();

// ── Idempotency guard ─────────────────────────────────────────────────────────
const pageCount = db.prepare('SELECT COUNT(*) as n FROM pages').get().n;
if (pageCount > 0) {
  console.log('Seed data already present — skipping.');
  process.exit(0);
}

console.log('Seeding database…');

// ── 1. Pages ──────────────────────────────────────────────────────────────────
const insertPage = db.prepare(
  'INSERT INTO pages (slug, title, meta_description) VALUES (?, ?, ?)'
);

const pages = [
  ['home',     'Home',     'BERG Collective — Building Equity & Representation in the Global creative economy.'],
  ['about',    'About',    'Learn about BERG Collective, our mission, leadership, and story.'],
  ['programs', 'Programs', 'Explore BERG programs: professional development, networking, and mentorship.'],
  ['chapters', 'Chapters', 'BERG chapters across Atlanta, New York, Los Angeles, and beyond.'],
  ['events',   'Events',   'Upcoming and past BERG Collective events, activations, and mixers.'],
  ['impact',   'Impact',   'The measurable impact BERG Collective has on its members and communities.'],
  ['donate',   'Donate',   'Support BERG Collective and help us build a more equitable creative economy.'],
  ['join',     'Join',     'Become a BERG member and join a network of creative professionals.'],
  ['contact',  'Contact',  'Get in touch with the BERG Collective team.'],
];

const pageIds = {};
for (const [slug, title, meta] of pages) {
  const info = insertPage.run(slug, title, meta);
  pageIds[slug] = info.lastInsertRowid;
}
console.log(`Created ${pages.length} pages.`);

// ── 2. Home page sections ─────────────────────────────────────────────────────
const insertSection = db.prepare(
  'INSERT INTO page_sections (page_id, section_key, fields, sort_order) VALUES (?, ?, ?, ?)'
);

const homeSections = [
  {
    key: 'hero',
    order: 1,
    fields: {
      badge_text: 'Building Equity & Representation',
      headline: 'Where Creative Professionals Connect & Thrive',
      subtitle: 'BERG Collective is a premier network for Black creative professionals — connecting talent across advertising, design, film, music, and beyond.',
      primary_btn_text: 'Join the Movement',
      primary_btn_link: '/join',
      secondary_btn_text: 'Explore Events',
      secondary_btn_link: '/events',
    },
  },
  {
    key: 'mission',
    order: 2,
    fields: {
      eyebrow: 'Our Mission',
      headline: 'Building Equity in the Creative Economy',
      body_text: 'BERG Collective exists to elevate Black creative professionals by providing access to opportunities, community, and resources that fuel career growth and economic empowerment.',
      link_text: 'Learn more about our story',
      link_url: '/about',
    },
  },
  {
    key: 'stats',
    order: 3,
    fields: {
      stat1_number: '2,500+',
      stat1_label: 'Members',
      stat1_desc: 'Creative professionals in our network',
      stat2_number: '12',
      stat2_label: 'Cities',
      stat2_desc: 'Active chapters across the country',
      stat3_number: '200+',
      stat3_label: 'Events',
      stat3_desc: 'Hosted since founding',
    },
  },
  {
    key: 'programs',
    order: 4,
    fields: {
      eyebrow: 'What We Offer',
      title: 'Programs Built for Creative Professionals',
    },
  },
  {
    key: 'cta',
    order: 5,
    fields: {
      headline: 'Ready to Join the Collective?',
      subtitle: 'Connect with thousands of Black creative professionals who are shaping the future of the industry.',
      btn_text: 'Become a Member',
      btn_link: '/join',
    },
  },
];

for (const s of homeSections) {
  insertSection.run(pageIds['home'], s.key, JSON.stringify(s.fields), s.order);
}
console.log(`Created ${homeSections.length} home page sections.`);

// ── 3. Events ─────────────────────────────────────────────────────────────────
const insertEvent = db.prepare(`
  INSERT INTO events
    (title, description, date, time, location, category, chapter,
     rsvp_platform, rsvp_url, is_featured, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const events = [
  {
    title: 'Spring Networking Mixer',
    description: "Join BERG Collective for our signature Spring Networking Mixer — an evening of connection, conversation, and community with Atlanta's top creative professionals.",
    date: '2026-04-18',
    time: '7:00 PM – 10:00 PM',
    location: 'Ponce City Market, Atlanta, GA',
    category: 'Networking',
    chapter: 'Atlanta',
    rsvp_platform: 'luma',
    rsvp_url: 'https://lu.ma/berg-spring-mixer',
    is_featured: 1,
    status: 'upcoming',
  },
  {
    title: 'Financial Empowerment Series',
    description: 'A three-part workshop series focused on financial literacy, investment strategies, and wealth-building for creative professionals.',
    date: '2026-05-07',
    time: '6:30 PM – 9:00 PM',
    location: 'WeWork Bryant Park, New York, NY',
    category: 'Workshop',
    chapter: 'New York',
    rsvp_platform: 'eventbrite',
    rsvp_url: 'https://www.eventbrite.com/e/berg-financial-empowerment',
    is_featured: 0,
    status: 'upcoming',
  },
  {
    title: 'Amy Sherald x BERG Whitney Activation',
    description: "An exclusive BERG activation at the Whitney Museum celebrating Amy Sherald's landmark solo exhibition. Members enjoyed a private preview, panel discussion, and mixer.",
    date: '2025-10-11',
    time: '6:00 PM – 9:30 PM',
    location: 'Whitney Museum of American Art, New York, NY',
    category: 'Activation',
    chapter: 'New York',
    rsvp_platform: 'custom',
    rsvp_url: '',
    is_featured: 1,
    status: 'past',
  },
  {
    title: 'Holiday Toy Drive & Mixer 2025',
    description: "BERG LA's annual Holiday Toy Drive & Mixer — a night of giving back, networking, and celebration. Attendees brought unwrapped toys benefiting local youth organizations.",
    date: '2025-12-06',
    time: '7:00 PM – 10:00 PM',
    location: 'SoFi Stadium Club, Inglewood, CA',
    category: 'Community',
    chapter: 'Los Angeles',
    rsvp_platform: 'custom',
    rsvp_url: '',
    is_featured: 0,
    status: 'past',
  },
];

const eventIds = {};
for (const e of events) {
  const info = insertEvent.run(
    e.title, e.description, e.date, e.time, e.location,
    e.category, e.chapter, e.rsvp_platform, e.rsvp_url,
    e.is_featured, e.status
  );
  eventIds[e.title] = info.lastInsertRowid;
}
console.log(`Created ${events.length} events.`);

// ── 4. Process images and populate media table ────────────────────────────────
const insertMedia = db.prepare(`
  INSERT INTO media
    (filename, original_path, webp_thumb, webp_medium, webp_full, jpg_fallback,
     width, height, size_bytes, webp_size_bytes, alt_text, category)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 10 representative images to process
const imagesToProcess = [
  { file: 'rich-headshot-new.jpg',               alt: 'Rich Nellhaus headshot',                      category: 'team' },
  { file: 'amy-sherald-exhibit.jpg',              alt: 'Amy Sherald exhibit at the Whitney Museum',   category: 'events' },
  { file: 'amysherald-whitney-photo.jpg',         alt: 'Amy Sherald at the Whitney',                  category: 'events' },
  { file: 'whitney-womens-panel.jpg',             alt: "BERG women's panel at the Whitney",           category: 'events' },
  { file: 'group-photo-berg-panel-whitney.jpg',   alt: 'BERG panel group photo at the Whitney',       category: 'events' },
  { file: 'holiday-toy-drive-genisha-jordan.jpg', alt: 'BERG Holiday Toy Drive',                      category: 'events' },
  { file: 'berg-summer mixer.jpg',                alt: 'BERG Summer Mixer',                           category: 'events' },
  { file: 'outdoor-whitney-muesuem.jpg',          alt: 'Outdoor Whitney Museum',                      category: 'venues' },
  { file: 'BERG-1562-scaled.jpg',                 alt: 'BERG event photo',                            category: 'events' },
  { file: 'Z8P_6651.jpg',                         alt: 'BERG event photo',                            category: 'events' },
];

const mediaIds = {};
console.log('Processing images…');
for (const img of imagesToProcess) {
  const originalPath = path.join(photosDir, img.file);
  const tempId = Date.now() + Math.floor(Math.random() * 1000);
  try {
    const result = await processImage(originalPath, tempId, img.file);
    const info = insertMedia.run(
      img.file,
      originalPath,
      result.webp_thumb,
      result.webp_medium,
      result.webp_full,
      result.jpg_fallback,
      result.width,
      result.height,
      result.size_bytes,
      result.webp_size_bytes,
      img.alt,
      img.category
    );
    mediaIds[img.file] = info.lastInsertRowid;
    console.log(`  Processed: ${img.file} → media id ${info.lastInsertRowid}`);
  } catch (err) {
    console.warn(`  Skipped ${img.file}: ${err.message}`);
  }
}

// ── 5. Link images to events ──────────────────────────────────────────────────
const updateEventCover = db.prepare('UPDATE events SET cover_image_id = ? WHERE id = ?');
const insertEventPhoto = db.prepare(
  'INSERT INTO event_photos (event_id, media_id, sort_order, caption) VALUES (?, ?, ?, ?)'
);

// Whitney activation → amy-sherald and group photos
const whitneyId = eventIds['Amy Sherald x BERG Whitney Activation'];
if (mediaIds['amy-sherald-exhibit.jpg'] && whitneyId) {
  updateEventCover.run(mediaIds['amy-sherald-exhibit.jpg'], whitneyId);
}
const whitneyPhotos = [
  'amysherald-whitney-photo.jpg',
  'whitney-womens-panel.jpg',
  'group-photo-berg-panel-whitney.jpg',
];
let sort = 1;
for (const f of whitneyPhotos) {
  if (mediaIds[f]) {
    insertEventPhoto.run(whitneyId, mediaIds[f], sort++, null);
  }
}

// Holiday Toy Drive → holiday photo
const holidayId = eventIds['Holiday Toy Drive & Mixer 2025'];
if (mediaIds['holiday-toy-drive-genisha-jordan.jpg'] && holidayId) {
  updateEventCover.run(mediaIds['holiday-toy-drive-genisha-jordan.jpg'], holidayId);
  insertEventPhoto.run(holidayId, mediaIds['holiday-toy-drive-genisha-jordan.jpg'], 1, null);
}

// Spring mixer → summer mixer photo as placeholder cover
const springId = eventIds['Spring Networking Mixer'];
if (mediaIds['berg-summer mixer.jpg'] && springId) {
  updateEventCover.run(mediaIds['berg-summer mixer.jpg'], springId);
}

console.log('Linked event cover images and event_photos.');
console.log('Seed complete.');
