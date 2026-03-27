import Newsletter from '../../components/Newsletter/Newsletter';
import usePageMeta from '../../hooks/usePageMeta';
import styles from './NewsletterPage.module.css';

export default function NewsletterPage() {
  usePageMeta('Newsletter', 'Stay connected with BERG Collective — events, programs, and community updates.');

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>STAY IN THE KNOW</span>
          <h1 className={styles.title}>Never Miss a Moment</h1>
          <p className={styles.subtitle}>
            From exclusive event invites to career resources, community spotlights,
            and industry insights — our newsletter keeps you plugged into everything
            BERG Collective.
          </p>
        </div>
      </section>

      {/* Newsletter signup */}
      <Newsletter />

      {/* What you'll get */}
      <section className={styles.benefits}>
        <div className={styles.benefitsInner}>
          <span className={styles.labelDark}>WHAT YOU'LL GET</span>
          <h2 className={styles.benefitsTitle}>Inside Every Issue</h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>📅</span>
              <h3 className={styles.benefitHeading}>Event Invites</h3>
              <p className={styles.benefitText}>
                Be the first to know about networking mixers, summits, and exclusive member gatherings.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>💼</span>
              <h3 className={styles.benefitHeading}>Career Resources</h3>
              <p className={styles.benefitText}>
                Job opportunities, mentorship openings, and professional development content curated for Black professionals.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>🌟</span>
              <h3 className={styles.benefitHeading}>Community Spotlights</h3>
              <p className={styles.benefitText}>
                Member stories, ERG highlights, and the people making moves across our network.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>📊</span>
              <h3 className={styles.benefitHeading}>Industry Insights</h3>
              <p className={styles.benefitText}>
                Trends, reports, and thought leadership relevant to Black professionals and ERG leaders.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
