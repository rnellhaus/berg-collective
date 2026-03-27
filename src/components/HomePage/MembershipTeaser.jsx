import { Link } from 'react-router-dom';
import styles from './MembershipTeaser.module.css';

const TIERS = [
  {
    id:       'growing',
    name:     'Growing Tier',
    title:    'Growing',
    desc:     'For smaller ERGs or local chapters looking to build momentum and establish their presence.',
    features: [
      '2 ERG Lead seats',
      'Up to 50 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Talent pipeline access',
    ],
    featured: false,
  },
  {
    id:       'established',
    name:     'Established Tier',
    title:    'Established',
    desc:     'For active ERGs seeking consistent engagement, visibility, and cross-industry connection.',
    features: [
      '2 ERG Lead seats',
      'Up to 150 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Monthly ERG leader meetings',
    ],
    featured: true,
    badge:    'Most Popular',
  },
  {
    id:       'enterprise',
    name:     'Enterprise Tier',
    title:    'Enterprise',
    desc:     'For large organizations maximizing recruitment, retention, and brand impact through BERG.',
    features: [
      '2 ERG Lead seats',
      'Up to 250 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Strategic input on BERG app & programming',
    ],
    featured: false,
  },
];

export default function MembershipTeaser() {
  return (
    <section className={styles.section} aria-labelledby="membership-teaser-heading">
      <div className="container">

        {/* ── Intro row ── */}
        <div className={styles.intro}>
          <div>
            <span className="section-label">Corporate Membership</span>
            <h2 id="membership-teaser-heading" className={styles.heading}>
              Your ERG's seat<br />at the table.
            </h2>
            <p className={styles.sub}>
              Three corporate membership tiers designed to meet your ERG where
              it is — and take it further. No pricing listed; we believe the
              right fit matters more than the right price.
            </p>
          </div>
          <div className={styles.introCard}>
            <p>
              BERG membership gives your ERG access to{' '}
              <strong>flagship events</strong>, a{' '}
              <strong>talent pipeline</strong>,{' '}
              <strong>leadership development</strong> with 45+ ERG leaders, and
              direct <strong>community impact</strong> opportunities — all built
              around Black professional excellence.
            </p>
          </div>
        </div>

        {/* ── Tier cards ── */}
        <div className={styles.tiers} role="list" aria-label="Membership tiers">
          {TIERS.map(({ id, name, title, desc, features, featured, badge }) => (
            <div
              key={id}
              className={`${styles.tier} ${featured ? styles.tierFeatured : ''}`}
              role="listitem"
              aria-label={name}
            >
              {badge && (
                <span className={styles.badge} aria-label="Most popular tier">
                  {badge}
                </span>
              )}

              <span className={styles.tierName}>{name}</span>
              <h3 className={styles.tierTitle}>{title}</h3>
              <p className={styles.tierDesc}>{desc}</p>

              <ul className={styles.features} aria-label={`${title} tier features`}>
                {features.map((f) => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.check} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/membership"
                className={`${styles.tierCta} ${
                  featured ? styles.tierCtaGold : styles.tierCtaDark
                }`}
              >
                Learn More
              </Link>
            </div>
          ))}
        </div>

        {/* ── Individual membership note ── */}
        <div className={styles.note} role="note">
          <strong>Individual Membership Coming in 2026.</strong> We are
          expanding access to individual Black professionals later this year.
          Join our waitlist to be the first to know when individual memberships
          open.{' '}
          <a href="/membership#individual" className={styles.noteLink}>
            Join the waitlist →
          </a>
        </div>

      </div>
    </section>
  );
}
