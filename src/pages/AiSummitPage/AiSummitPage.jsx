import { useEffect, useRef, useState } from 'react';
import styles from './AiSummitPage.module.css';

/* ──────────────────────────────────────────────────────────────
   Amplified Intelligence — The BERG AI Summit 2026
   Standalone deep-space landing page (own nav + footer, isolated
   from the main BERG site shell). Goal #1: Luma RSVPs on-page.
   ────────────────────────────────────────────────────────────── */

const SITE_URL = 'https://bergcollective.org';
const PAGE_PATH = '/aisummit';
const OG_IMAGE = `${SITE_URL}/images/aisummit/og-amplified-intelligence.jpg`;
const LUMA_EVENT_URL = 'https://luma.com/qw6m5bzv';
// TODO: replace the short-code embed below with the exact "evt-…" id from
// Luma → Share → Embed once available (see README-DEPLOY.md).
const LUMA_EMBED_SRC = 'https://lu.ma/embed/event/qw6m5bzv/simple';

const STATS = [
  { value: '150+', label: 'Professionals' },
  { value: '50+', label: 'Companies' },
  { value: '10,000+', label: 'Member community' },
];

const GAINS = [
  {
    icon: 'rocket',
    title: 'Career Future-Proofing',
    body: 'Learn directly from AI-native operators who are actively driving organizational transformation.',
  },
  {
    icon: 'tools',
    title: 'Hands-On Fluency',
    body: 'Intensive, track-specific workshops tailored to your functional role.',
  },
  {
    icon: 'handshake',
    title: 'Peer-to-Peer Celebration',
    body: 'Connect with a diverse network of ambitious peers closing the AI fluency gap together.',
  },
];

const SCHEDULE = [
  { time: '10:00 AM', title: 'Registration & Morning Coffee', sub: 'Check-in, grab a coffee, meet fellow attendees.' },
  { time: '11:00 AM', title: 'Welcome Address', sub: 'Opening remarks from BERG Leadership.' },
  { time: '11:15 AM', title: 'Fireside Chat', talk: 'Onward', sub: 'Future-Proofing Your Career in the Age of AI, with top AI-native operators.' },
  { time: '12:00 PM', title: 'Lunch & Networking', sub: 'Premium catered lunch at Squarespace HQ.' },
  { time: '12:45 PM', title: 'Interactive Workshops', sub: 'Track-specific, hands-on sessions.' },
  { time: '02:45 PM', title: 'Fireside Chat', talk: 'Interoperability', sub: 'Building for Agents and Humans, with AI-native entrepreneurs.' },
  { time: '03:30 PM', title: 'Coffee Break', sub: 'Afternoon refresh and networking.' },
  { time: '03:45 PM', title: 'Live Demos', sub: 'Top 2 AI hacks from each workshop track.' },
  { time: '04:00 PM', title: 'Keynote', talk: 'Moving at the Speed of Thought', sub: 'The closing vision for an AI-native future.' },
  { time: '05:00 PM', title: 'Closing Ceremony', sub: 'Peer celebration, awards, and prizes.' },
  { time: '05:30 PM', title: 'Reception & Afterparty', sub: 'Location TBD.' },
];

const TRACKS = [
  { n: '01', title: 'Product, Design, Engineering & TPM' },
  { n: '02', title: 'Finance, Compliance & Legal' },
  { n: '03', title: 'Marketing & Sales' },
  { n: '04', title: 'Founders & Entrepreneurs' },
];

// img: slug of optimized webp in /images/aisummit/speakers, or null for an initials tile.
const SPEAKERS = [
  { img: 'dion-ridley', name: 'Dion Ridley', title: 'Engineering Leader, Netflix' },
  { img: 'evol-greaves', name: 'Evol Greaves', title: 'VP of Engineering, Betterment' },
  { img: 'justin-elliot', name: 'Justin Elliot', title: 'Co-Founder & CTO, WRTH · Anthropic Ambassador' },
  { img: 'justin-williams', name: 'Justin Williams', title: 'Co-Founder, Crown Dev Studios' },
  { img: 'x-eyee', name: 'X. Eyee', title: 'CEO, Malo Santo' },
  { img: 'monk-inyang', name: 'Monk Inyang', title: 'CEO, 1st Street Partnerships' },
  { img: 'ian-grant', name: 'Ian Grant', title: 'CEO, Greenlit' },
  { img: 'marcus-ellison', name: 'Marcus Ellison', title: 'Founder & CEO, Breadcrumb.ai' },
  { img: 'tunde-ajaba-ogundipe', name: 'Tunde Ajaba-Ogundipe', title: 'Speaker' },
  { img: 'rich-nellhaus', name: 'Rich Nellhaus', title: 'Founder, Staffify & BERG Collective' },
];

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/* ── Inline brand mark: "Ai" monogram with the signature gradient ── */
function Monogram({ size = 30, idSuffix = 'nav' }) {
  const gid = `aiGrad-${idSuffix}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Amplified Intelligence" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C8FF" />
          <stop offset="1" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <path
        d="M7 52 L24 13 L41 52"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 40 H33" fill="none" stroke={`url(#${gid})`} strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="52" cy="18.5" r="4.3" fill={`url(#${gid})`} />
      <rect x="48" y="28" width="8" height="24" rx="4" fill={`url(#${gid})`} />
    </svg>
  );
}

function GainIcon({ name }) {
  const common = {
    width: 30,
    height: 30,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'url(#gainGrad)',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
  };
  if (name === 'rocket') {
    return (
      <svg {...common}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    );
  }
  if (name === 'tools') {
    return (
      <svg {...common}>
        <path d="M14.7 6.3a4 4 0 0 0 5 5l-7.4 7.4a2 2 0 0 1-2.8-2.8Z" />
        <path d="m9 7-5 5 3 3 5-5" />
        <path d="m2 19 3 3" />
      </svg>
    );
  }
  // handshake
  return (
    <svg {...common}>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a2 2 0 0 1 0-2.8l.4-.4" />
      <path d="m21 3-4 4-2-2-5 5a1.4 1.4 0 0 0 0 2 1.4 1.4 0 0 0 2 0l3-3" />
      <path d="M3 3l4 4" />
    </svg>
  );
}

/* ── Animated particle-wave background (canvas) ──
   prefers-reduced-motion → single static frame.
   navigator.webdriver (prerender) → skipped, so static HTML stays clean. */
function ParticleField({ calm = false, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isPrerender = typeof navigator !== 'undefined' && navigator.webdriver;
    const animate = !reduce && !isPrerender;

    let raf = 0;
    let nodes = [];
    let w = 0;
    let h = 0;
    let dpr = 1;

    const LINK_DIST = calm ? 150 : 130;

    function build() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = calm ? 17000 : 11000;
      const count = Math.min(Math.round((w * h) / density), calm ? 60 : 110);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (calm ? 0.12 : 0.22),
        vy: (Math.random() - 0.5) * (calm ? 0.12 : 0.22),
        r: Math.random() * 1.6 + 0.6,
      }));
    }

    function colorAt(x) {
      const t = Math.max(0, Math.min(1, x / w));
      const r = Math.round(0x00 + (0x7c - 0x00) * t);
      const g = Math.round(0xc8 + (0x4d - 0xc8) * t);
      const b = Math.round(0xff + (0xff - 0xff) * t);
      return `${r},${g},${b}`;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (animate) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -20) a.x = w + 20;
          if (a.x > w + 20) a.x = -20;
          if (a.y < -20) a.y = h + 20;
          if (a.y > h + 20) a.y = -20;
        }
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const op = (1 - d / LINK_DIST) * (calm ? 0.16 : 0.3);
            ctx.strokeStyle = `rgba(${colorAt((a.x + b.x) / 2)},${op})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${colorAt(n.x)},${calm ? 0.5 : 0.85})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (animate) raf = requestAnimationFrame(draw);
    }

    build();
    draw();

    let resizeId = 0;
    function onResize() {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(() => {
        build();
        if (!animate) draw();
      }, 180);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeId);
      window.removeEventListener('resize', onResize);
    };
  }, [calm]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/* ── Per-route head management: title, meta, OG, JSON-LD, favicon ── */
function useSummitHead() {
  useEffect(() => {
    const title = 'Amplified Intelligence — The BERG AI Summit 2026';
    const description =
      'Moving at the speed of thought. Join 150+ leaders at Squarespace HQ on June 27, 2026 to bridge the AI fluency gap and future-proof your career. Presented by Squarespace.';
    const url = `${SITE_URL}${PAGE_PATH}`;

    const created = [];
    const prevTitle = document.title;

    function meta(attr, key, content) {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      let mine = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        mine = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', content);
      created.push({ el, mine, prev });
    }
    function link(rel, href) {
      let el = document.head.querySelector(`link[rel="${rel}"]`);
      let mine = false;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
        mine = true;
      }
      const prev = el.getAttribute('href');
      el.setAttribute('href', href);
      created.push({ el, mine, prev });
    }

    document.title = title;
    meta('name', 'description', description);
    link('canonical', url);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', 'BERG Collective');
    meta('property', 'og:title', title);
    meta('property', 'og:description', description);
    meta('property', 'og:url', url);
    meta('property', 'og:image', OG_IMAGE);
    meta('property', 'og:image:width', '1200');
    meta('property', 'og:image:height', '1200');
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', description);
    meta('name', 'twitter:image', OG_IMAGE);
    link('icon', '/images/aisummit/ai-monogram.svg');
    link('apple-touch-icon', '/images/aisummit/apple-touch-icon.png');

    // Remove any prerender-baked instance so we never end up with duplicates.
    document.getElementById('aisummit-jsonld')?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = 'aisummit-jsonld';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Amplified Intelligence — The BERG AI Summit 2026',
      description,
      startDate: '2026-06-27T10:00:00-04:00',
      endDate: '2026-06-27T17:00:00-04:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: [OG_IMAGE],
      url,
      location: {
        '@type': 'Place',
        name: 'Squarespace HQ',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '225 Varick St',
          addressLocality: 'New York',
          addressRegion: 'NY',
          postalCode: '10014',
          addressCountry: 'US',
        },
      },
      organizer: { '@type': 'Organization', name: 'BERG Collective', url: SITE_URL },
      sponsor: { '@type': 'Organization', name: 'Squarespace' },
      offers: {
        '@type': 'Offer',
        url: LUMA_EVENT_URL,
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'USD',
      },
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      ld.remove();
      // Restore icon/touch-icon so the main site keeps its favicon after SPA nav.
      created.forEach(({ el, mine, prev }) => {
        if (mine) {
          el.remove();
        } else if (prev !== null) {
          el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', prev);
        }
      });
    };
  }, []);
}

export default function AiSummitPage() {
  const rootRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useSummitHead();

  // Deep-space body background (and restore on unmount) to kill overscroll flashes.
  useEffect(() => {
    const body = document.body;
    const prevBg = body.style.background;
    const prevScheme = body.style.colorScheme;
    body.style.background = '#060B14';
    body.style.colorScheme = 'dark';
    return () => {
      body.style.background = prevBg;
      body.style.colorScheme = prevScheme;
    };
  }, []);

  // Sticky-nav scrolled state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On-scroll fade-up reveals. Skipped under reduced-motion and during prerender
  // (navigator.webdriver) so the static HTML ships fully visible.
  useEffect(() => {
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isPrerender = typeof navigator !== 'undefined' && navigator.webdriver;
    const root = rootRef.current;
    if (reduce || isPrerender || !root) return undefined;

    root.classList.add(styles.armed);
    const els = root.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute('data-inview', '');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove(styles.armed);
    };
  }, []);

  // Luma checkout overlay script (real clients only; not during prerender).
  useEffect(() => {
    const isPrerender = typeof navigator !== 'undefined' && navigator.webdriver;
    if (isPrerender) return undefined;
    if (document.getElementById('luma-checkout')) return undefined;
    const s = document.createElement('script');
    s.id = 'luma-checkout';
    s.src = 'https://embed.luma-cdn.com/luma-checkout.js';
    s.defer = true;
    document.body.appendChild(s);
    return undefined;
  }, []);

  return (
    <div ref={rootRef} className={styles.page}>
      <a href="#register" className={styles.skip}>
        Skip to registration
      </a>

      {/* ── Nav ── */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <a className={styles.brand} href="#top" aria-label="Amplified Intelligence — top of page">
            <Monogram size={30} idSuffix="nav" />
            <span className={styles.brandText}>Amplified Intelligence</span>
          </a>
          <nav className={styles.navLinks} aria-label="Primary">
            <a href="#about">About</a>
            <a href="#agenda">Agenda</a>
            <a href="#tracks">Tracks</a>
            <a href="#register">Register</a>
          </nav>
          <a
            href={LUMA_EVENT_URL}
            className={`${styles.btn} ${styles.btnSm} luma-checkout--button`}
            data-luma-action="checkout"
          >
            Register
          </a>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <ParticleField className={styles.heroCanvas} />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={`${styles.presenting} ${styles.heroEnter}`}>
              <span className={styles.presentedBy}>Presented by</span>
              <img
                className={styles.ssLogo}
                src="/images/aisummit/squarespace-white.webp"
                width="150"
                height="22"
                alt="Squarespace"
                fetchPriority="high"
              />
            </div>
            <img
              className={`${styles.heroLockup} ${styles.heroEnter}`}
              src="/images/aisummit/lockup.webp"
              width="760"
              height="230"
              alt="Amplified Intelligence — Moving at the speed of thought"
              fetchPriority="high"
            />
            <p className={`${styles.heroTagline} ${styles.heroEnter}`}>Moving at the speed of thought.</p>
            <p className={`${styles.heroMeta} ${styles.heroEnter}`}>
              June 27, 2026 <span>·</span> 10AM–5PM <span>·</span> Squarespace HQ <span>·</span> New York City
            </p>
            <a
              href={LUMA_EVENT_URL}
              className={`${styles.btn} ${styles.btnLg} ${styles.heroEnter} luma-checkout--button`}
              data-luma-action="checkout"
            >
              Reserve Your Spot <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* ── Intro ── */}
        <section id="about" className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.lede} data-reveal>
              AI is moving at the speed of light. To keep pace, we must move at the speed of thought.
            </p>
            <div className={styles.introBody}>
              <p data-reveal>
                Welcome to <strong>The BERG AI Summit 2026</strong> — an immersive, full-day experience for
                professionals, builders, and entrepreneurs who refuse to be left on the wrong side of the future
                job market. June 27, 2026, at Squarespace HQ in New York City. Your gateway to becoming truly
                AI-native.
              </p>
              <p data-reveal>
                AI is reshaping every job function — disrupting some, collapsing others, expanding the rest.
                Economic mobility now depends on mastering these tools. Because peer-to-peer learning is one of the
                fastest paths to fluency, BERG is bringing together <strong>150+ professionals from 50+ leading
                companies</strong> (including Amazon, NBA, PepsiCo, Fortune, Disney, and Squarespace) to learn,
                build, and celebrate together.
              </p>
            </div>
            <ul className={styles.stats} data-reveal>
              {STATS.map((s) => (
                <li key={s.label} className={styles.statChip}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Why be in the room ── */}
        <section className={styles.section}>
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow} data-reveal>
              Why You Need to Be in the Room
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <p className={styles.bigStatement} data-reveal>
              This is not a passive trade show. It is a highly curated, premium environment — reminiscent of a
              modern museum lobby or a private members lounge — where powerful ideas and people take up space.
            </p>
          </div>
        </section>

        {/* ── What you'll gain ── */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow} data-reveal>
              What You Will Gain
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="gainGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2EDCFF" />
                  <stop offset="1" stopColor="#A56BFF" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.cards}>
              {GAINS.map((g) => (
                <article key={g.title} className={styles.card} data-reveal>
                  <span className={styles.cardIcon}>
                    <GainIcon name={g.icon} />
                  </span>
                  <h3 className={styles.cardTitle}>{g.title}</h3>
                  <p className={styles.cardBody}>{g.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Program schedule ── */}
        <section id="agenda" className={styles.section}>
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow} data-reveal>
              Program Schedule
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <h2 className={styles.h2} data-reveal>
              A full day, <span className={styles.grad}>end to end.</span>
            </h2>
            <ol className={styles.timeline}>
              {SCHEDULE.map((item, i) => (
                <li key={`${item.time}-${i}`} className={styles.tItem} data-reveal>
                  <span className={styles.tTime}>{item.time}</span>
                  <span className={styles.tDot} aria-hidden="true" />
                  <div className={styles.tBody}>
                    <h3 className={styles.tTitle}>
                      {item.title}
                      {item.talk && (
                        <>
                          {': '}
                          <em className={styles.tTalk}>{item.talk}</em>
                        </>
                      )}
                    </h3>
                    <p className={styles.tSub}>{item.sub}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Tracks ── */}
        <section id="tracks" className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow} data-reveal>
              Track-Specific Workshops
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <h2 className={styles.h2} data-reveal>
              Built for <span className={styles.grad}>your function.</span>
            </h2>
            <div className={styles.trackGrid}>
              {TRACKS.map((t) => (
                <article key={t.n} className={styles.trackCard} data-reveal>
                  <span className={styles.trackNum}>Track {t.n}</span>
                  <h3 className={styles.trackTitle}>{t.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Speakers ── */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow} data-reveal>
              Featured Speakers
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <h2 className={styles.h2} data-reveal>
              Learn from <span className={styles.grad}>AI-native operators.</span>
            </h2>
            <ul className={styles.speakerGrid}>
              {SPEAKERS.map((sp) => (
                <li key={sp.name} className={styles.speaker} data-reveal>
                  <div className={styles.speakerPhoto}>
                    {sp.img ? (
                      <img
                        src={`/images/aisummit/speakers/${sp.img}.webp`}
                        width="280"
                        height="280"
                        loading="lazy"
                        decoding="async"
                        alt={sp.name}
                      />
                    ) : (
                      <span className={styles.speakerInitials} aria-hidden="true">
                        {initials(sp.name)}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.speakerName}>{sp.name}</h3>
                  <p className={styles.speakerTitle}>{sp.title}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Register (conversion) ── */}
        <section id="register" className={styles.register}>
          <div className={styles.registerGlow} aria-hidden="true" />
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow} data-reveal>
              Reserve Your Spot
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <h2 className={styles.h2} data-reveal>
              Secure your <span className={styles.grad}>spot today.</span>
            </h2>
            <p className={styles.registerSub} data-reveal>
              Becoming AI-native is a team sport. Be a team player.
            </p>
            <div className={styles.embedPanel} data-reveal>
              <iframe
                className={styles.lumaFrame}
                src={LUMA_EMBED_SRC}
                width="100%"
                height="760"
                frameBorder="0"
                style={{ border: 'none' }}
                allow="fullscreen; payment"
                loading="lazy"
                title="Register for Amplified Intelligence — AI Summit 2026"
              />
            </div>
            <a
              href={LUMA_EVENT_URL}
              className={`${styles.btn} ${styles.btnLg} ${styles.registerCta} luma-checkout--button`}
              data-luma-action="checkout"
            >
              Reserve Your Spot <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* ── About BERG ── */}
        <section className={styles.section}>
          <div className={styles.wrapNarrow}>
            <p className={styles.eyebrow} data-reveal>
              About BERG Collective
            </p>
            <span className={styles.rule} data-reveal aria-hidden="true" />
            <p className={styles.bigStatement} data-reveal>
              BERG unites professionals committed to connection, professional development, and economic
              empowerment for each other. With a community of <strong>over 10,000 members</strong>, BERG ensures
              our community remains at the forefront of professional excellence.
            </p>
            <blockquote className={styles.pullQuote} data-reveal>
              <span className={styles.grad}>“Becoming AI-native is a team sport. Be a team player.”</span>
            </blockquote>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <ParticleField calm className={styles.footerCanvas} />
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Monogram size={34} idSuffix="footer" />
            <span>Amplified Intelligence — The BERG AI Summit 2026</span>
          </div>
          <div className={styles.footerPartners}>
            <div className={styles.footerPresented}>
              <span className={styles.presentedBy}>Presented by</span>
              <img
                className={styles.ssLogoFooter}
                src="/images/aisummit/squarespace-white.webp"
                width="132"
                height="19"
                alt="Squarespace"
                loading="lazy"
              />
            </div>
            <div className={styles.footerPresented}>
              <span className={styles.presentedBy}>Organized by</span>
              <img
                className={styles.bergLogoFooter}
                src="/images/aisummit/berg-white.webp"
                width="100"
                height="46"
                alt="BERG Collective"
                loading="lazy"
              />
            </div>
          </div>
          <p className={styles.footerAddr}>225 Varick St, New York, NY 10014</p>
          <a
            href={LUMA_EVENT_URL}
            className={`${styles.btn} ${styles.btnSm} luma-checkout--button`}
            data-luma-action="checkout"
          >
            Register
          </a>
          <ul className={styles.social} aria-label="BERG Collective social links">
            <li>
              <a href="https://www.instagram.com/bergcollective" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </li>
            <li>
              <a href="https://www.linkedin.com/company/berg-collective2" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H17.6v-5.6c0-1.34-.02-3.06-1.86-3.06-1.87 0-2.16 1.46-2.16 2.96V21H9V9Z" />
                </svg>
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@berg.collective" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.5 3c.3 2.1 1.5 3.8 3.5 4.2v3c-1.4 0-2.7-.4-3.8-1.1v6.1a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.1a2.7 2.7 0 1 0 1.9 2.6V3h3.2Z" />
                </svg>
              </a>
            </li>
          </ul>
          <p className={styles.copyright}>© {new Date().getFullYear()} BERG Collective. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
