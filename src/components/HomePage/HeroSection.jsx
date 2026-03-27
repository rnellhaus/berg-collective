import { Link } from 'react-router-dom';
import styles from './HeroSection.module.css';

const heroImage = '/images/photos/DTRT-crowd-photo.jpg';

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
        <img
          src={heroImage}
          alt="BERG Collective members at the Whitney Museum Free Friday Night, New York City"
          className={styles.image}
          loading="eager"
          fetchpriority="high"
        />
        <div className={styles.imageOverlay} aria-hidden="true" />
        <div className={styles.caption}>
          <p className={styles.captionTitle}>Whitney Museum Free Friday Night</p>
          <span className={styles.captionSub}>New York City · 5,000+ Attendees</span>
        </div>
      </div>
    </section>
  );
}
