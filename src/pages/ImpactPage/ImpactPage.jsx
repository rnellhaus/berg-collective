import styles from './ImpactPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const stats = [
  { number: '12K+', label: 'Professionals Connected' },
  { number: '40+', label: 'ERG Partners' },
  { number: '$50K+', label: 'Invested in Black-Owned Businesses' },
  { number: '5', label: 'Cities Represented' },
];

const partners = [
  'Google', 'Disney', 'NFL', 'Netflix', 'Betterment', 'TikTok',
  'LinkedIn', 'Amazon', 'Meta', 'Microsoft', 'Spotify', 'PepsiCo',
  'Adobe', 'Warner Bros.',
];

const highlights = [
  {
    image: '/images/photos/BERG-7213-scaled.jpg',
    alt: 'BERG Collective summit gathering',
    eyebrow: 'Community Building',
    title: 'Connecting Professionals Across Industries',
    body: 'In 2025, BERG Collective brought together professionals from over 40 corporate ERGs for networking events, panel discussions, and summits that sparked meaningful career connections and cross-company collaboration.',
  },
  {
    image: '/images/photos/whitney-womens-panel.jpg',
    alt: "BERG women's leadership panel at the Whitney Museum",
    eyebrow: 'Leadership Development',
    title: "Elevating ERG Leaders at Every Level",
    body: "From our sold-out Women's Leadership Panel at the Whitney Museum to intimate executive roundtables, BERG programming in 2025 equipped ERG leaders with the skills, visibility, and relationships to lead with greater impact.",
  },
  {
    image: '/images/photos/BERG-1562-scaled.jpg',
    alt: 'BERG Collective members at a signature event',
    eyebrow: 'Economic Impact',
    title: 'Investing in Black-Owned Businesses',
    body: 'BERG Collective directed over $50,000 in spending toward Black-owned vendors, caterers, photographers, and production companies in 2025 — turning every event into an economic opportunity for Black entrepreneurs.',
  },
  {
    image: '/images/photos/group-photo-berg-panel-whitney.jpg',
    alt: 'Group photo at BERG panel event',
    eyebrow: 'Network Growth',
    title: 'Expanding Our Footprint Nationally',
    body: 'With a presence now spanning 5 cities and growing, BERG Collective is building the infrastructure to support ERGs wherever Black professionals are showing up and leading.',
  },
];

export default function ImpactPage() {
  usePageMeta('Impact', 'See the 2025 impact BERG Collective is making for Black professionals and ERGs.');
  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.sectionLabel}>2025 IMPACT REPORT</span>
          <h1 className={styles.heroTitle}>Driving Change. Building Legacy.</h1>
          <p className={styles.heroSubtitle}>
            In 2025, BERG Collective deepened its partnerships with ERGs across the country,
            expanded programming in 5 cities, and invested meaningfully in the Black professional
            ecosystem. Here's what we built together.
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <span className={styles.statNumber}>{stat.number}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Grid */}
      <section className={styles.partnersSection}>
        <div className={styles.partnersInner}>
          <span className={styles.sectionLabel}>OUR PARTNERS</span>
          <div className={styles.partnerGrid}>
            {partners.map((partner) => (
              <div key={partner} className={styles.partnerItem}>
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Highlights */}
      <section className={styles.highlightsSection}>
        <div className={styles.highlightsInner}>
          <span className={styles.sectionLabel}>IMPACT HIGHLIGHTS</span>
          <h2 className={styles.highlightsTitle}>What We Accomplished in 2025</h2>
          <div className={styles.highlightsList}>
            {highlights.map((item, i) => (
              <div
                key={item.title}
                className={`${styles.highlightRow} ${i % 2 !== 0 ? styles.highlightRowReverse : ''}`}
              >
                <div className={styles.highlightImageWrap}>
                  <img
                    src={item.image}
                    alt={item.alt}
                    className={styles.highlightImage}
                    loading="lazy"
                  />
                </div>
                <div className={styles.highlightText}>
                  <span className={styles.highlightEyebrow}>{item.eyebrow}</span>
                  <h3 className={styles.highlightHeading}>{item.title}</h3>
                  <p className={styles.highlightBody}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className={styles.downloadBanner}>
        <div className={styles.downloadInner}>
          <h2 className={styles.downloadTitle}>Download the Full 2025 Impact Report</h2>
          <p className={styles.downloadSub}>
            Get the complete data, stories, and vision for what BERG Collective is building.
          </p>
          <a href="#" className={styles.downloadBtn}>
            Download PDF
          </a>
        </div>
      </section>

    </main>
  );
}
