import DonationWidget from '../../components/DonationWidget/DonationWidget';
import Button from '../../components/Button/Button';
import styles from './DonatePage.module.css';

export default function DonatePage() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>Support Our Mission</span>
          <h1 className={styles.heroTitle}>
            Support the{' '}
            <span className={styles.gold}>Movement</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Your tax-deductible donation fuels mentorship, professional development, and
            community building for Black professionals across the country. Every contribution
            makes a direct impact.
          </p>
        </div>
      </section>

      {/* Widget */}
      <section className={styles.widgetSection}>
        <div className={styles.widgetInner}>
          <DonationWidget />
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Other Ways to Give</h2>
          <p className={styles.ctaDesc}>
            Interested in corporate partnerships, in-kind donations, or planned giving?
            We'd love to talk.
          </p>
          <Button to="/contact" variant="primary">Contact Us</Button>
        </div>
      </section>
    </main>
  );
}
