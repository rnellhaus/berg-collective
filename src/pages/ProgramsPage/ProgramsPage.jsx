import styles from './ProgramsPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const PILLARS = [
  {
    number: '01',
    title: 'Financial Empowerment',
    image: '/images/photos/i-QdZRfh3-X5.jpg',
    alt: 'BERG financial empowerment session',
    description:
      'Building generational wealth starts with financial literacy. Through expert-led workshops and peer learning, we equip Black professionals with the tools to invest wisely, negotiate compensation, and create sustainable financial futures.',
    highlights: [
      'Investment strategy workshops',
      'Compensation negotiation frameworks',
      'Wealth-building masterclasses',
      'Entrepreneurial finance fundamentals',
    ],
  },
  {
    number: '02',
    title: 'Structured Networking',
    image: '/images/photos/R5TF1211.jpg',
    alt: 'BERG structured networking event',
    description:
      'Meaningful connections don\u2019t happen by accident. Our curated networking experiences pair professionals across industries and career stages, creating relationships that open doors, spark collaborations, and build lasting community.',
    highlights: [
      'Curated industry mixers',
      'Cross-chapter introductions',
      'Executive roundtables',
      'Peer accountability circles',
    ],
  },
  {
    number: '03',
    title: 'Career Growth',
    image: '/images/photos/whitney-womens-panel.jpg',
    alt: 'BERG career growth programming',
    description:
      'Advancing in your career requires more than hard work. We provide structured pathways, mentorship, and skill development designed to help mid-level professionals break into senior leadership and C-suite roles.',
    highlights: [
      'Leadership development tracks',
      'Executive presence coaching',
      'Skills workshops and certifications',
      'Career transition support',
    ],
  },
];

export default function ProgramsPage() {
  usePageMeta(
    'Leadership & Career Programs for Black Professionals',
    'Financial empowerment, structured networking, and leadership development programs for Black professionals and ERGs nationwide.',
    { path: '/programs' }
  );

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>Our Programs</p>
          <h1 className={styles.heroTitle}>Three Pillars of Growth</h1>
          <p className={styles.heroSubtitle}>
            BERG Collective builds programs around the areas that matter most to
            Black professionals — financial knowledge, powerful networks, and
            career advancement.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className={styles.pillars}>
        {PILLARS.map((pillar, i) => (
          <div
            key={pillar.number}
            className={`${styles.pillar} ${i % 2 === 1 ? styles.pillarReversed : ''}`}
          >
            <div className={styles.pillarImageWrap}>
              <img
                src={pillar.image}
                alt={pillar.alt}
                className={styles.pillarImage}
              />
              <span className={styles.pillarNumber}>{pillar.number}</span>
            </div>
            <div className={styles.pillarContent}>
              <p className={styles.eyebrow}>Pillar {pillar.number}</p>
              <h2 className={styles.pillarTitle}>{pillar.title}</h2>
              <p className={styles.pillarDesc}>{pillar.description}</p>
              <ul className={styles.highlightList}>
                {pillar.highlights.map((h) => (
                  <li key={h} className={styles.highlightItem}>
                    <span className={styles.highlightDot} aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      {/* Mentorship coming soon */}
      <section className={styles.mentorship}>
        <div className={styles.mentorshipInner}>
          <span className={styles.comingSoonBadge}>Coming 2026</span>
          <h2 className={styles.mentorshipTitle}>Mentorship Program</h2>
          <p className={styles.mentorshipDesc}>
            We're building a dedicated mentorship program to pair emerging
            professionals with experienced leaders across industries. More
            details will be shared as we get closer to launch.
          </p>
        </div>
      </section>

      {/* Philosophy / closing section */}
      <section className={styles.philosophy}>
        <div className={styles.philosophyInner}>
          <h2 className={styles.philosophyTitle}>Built for the Long Game</h2>
          <p className={styles.philosophyDesc}>
            Every BERG program is designed around one principle: sustainable
            progress. We don't chase quick wins. We invest in the knowledge,
            relationships, and skills that compound over a career and across a
            community.
          </p>
        </div>
      </section>
    </main>
  );
}
