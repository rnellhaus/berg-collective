import { Link } from 'react-router-dom';
import styles from './HeroSection.module.css';

const HERO_BASE = '/images/photos/DTRT-crowd-photo';

export default function HeroSection() {
  return (
    <section className={styles.hero} aria-label="Hero">
      {/* ── Left: Content ── */}
      <div className={styles.content}>
        <div className={styles.badge} aria-label="Now accepting ERG partners for 2026">
          <span className={styles.badgeDot} aria-hidden="true" />
          Now Accepting ERG Partners — 2026
        </div>

        <h1 className={styles.heading}>
          Where Black<br />
          Excellence<br />
          <span className={styles.headingAccent}>Builds Power.</span>
        </h1>

        <p className={styles.sub}>
          BERG Collective unites Black Employee Resource Groups across tech,
          sports, and entertainment — creating career pathways, community
          impact, and generational wealth.
        </p>

        <div className={styles.ctas}>
          <Link to="/membership" className={styles.btnPrimary}>
            Partner With Us
          </Link>
          <Link to="/impact" className={styles.btnOutline}>
            View 2025 Impact
          </Link>
        </div>

        {/* ── Stats strip ── */}
        <div className={styles.stats} role="list" aria-label="Key statistics">
          {[
            { num: '12K+', label: 'Professionals Engaged' },
            { num: '40+',  label: 'ERG Partners' },
            { num: '5',    label: 'Cities Activated' },
          ].map(({ num, label }) => (
            <div key={label} className={styles.stat} role="listitem">
              <span className={styles.statNum}>{num}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Image ── */}
      <div className={styles.imageWrap}>
        <picture>
          <source
            type="image/webp"
            srcSet={`${HERO_BASE}-640.webp 640w, ${HERO_BASE}-960.webp 960w, ${HERO_BASE}-1280.webp 1280w, ${HERO_BASE}-1920.webp 1920w`}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <source
            type="image/jpeg"
            srcSet={`${HERO_BASE}-640.jpg 640w, ${HERO_BASE}-960.jpg 960w, ${HERO_BASE}-1280.jpg 1280w, ${HERO_BASE}-1920.jpg 1920w`}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <img
            src={`${HERO_BASE}-1280.jpg`}
            alt="BERG Collective members at the Whitney Museum Free Friday Night, New York City"
            className={styles.image}
            loading="eager"
            fetchPriority="high"
            width="1280"
            height="853"
          />
        </picture>
        <div className={styles.imageOverlay} aria-hidden="true" />
        <div className={styles.caption}>
          <p className={styles.captionTitle}>Whitney Museum Free Friday Night</p>
          <span className={styles.captionSub}>New York City · 5,000+ Attendees</span>
        </div>
      </div>
    </section>
  );
}
