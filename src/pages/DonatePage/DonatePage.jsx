import Newsletter from '../../components/Newsletter/Newsletter';
import DonorboxEmbed from '../../components/DonorboxEmbed/DonorboxEmbed';
import styles from './DonatePage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const allocationItems = [
  { percent: '60%', label: 'Programs & Events' },
  { percent: '25%', label: 'Scholarships' },
  { percent: '15%', label: 'Operations' },
];

export default function DonatePage() {
  usePageMeta(
    'Donate — Support Black ERGs Nationwide',
    'Make a tax-deductible donation to BERG Collective, a 501(c)(3) nonprofit supporting Black Employee Resource Groups, leadership programs, and community events.',
    { path: '/donate' }
  );
  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.sectionLabel}>SUPPORT THE MOVEMENT</span>
          <h1 className={styles.heroTitle}>Invest in Black Excellence</h1>
          <p className={styles.heroSubtitle}>
            Your tax-deductible donation fuels mentorship, professional development, and
            community building for Black professionals across the country. Every contribution
            makes a direct impact.
          </p>
        </div>
      </section>

      {/* Donation Info */}
      <section className={styles.infoSection}>
        <div className={styles.infoInner}>

          {/* Left: Why Donate */}
          <div className={styles.whyDonate}>
            <span className={styles.sectionLabelDark}>WHY DONATE</span>
            <h2 className={styles.infoHeading}>Your Support Builds Community</h2>
            <p className={styles.infoBody}>
              BERG Collective is on the front lines of creating real opportunities for Black
              professionals — from curated networking events and executive roundtables to
              leadership workshops and mentorship cohorts.
            </p>
            <p className={styles.infoBody}>
              When you donate, you're funding access. You're ensuring that ERG leaders have the
              resources to lead, that emerging professionals find the connections they need, and
              that Black-owned businesses get meaningful economic opportunities through our events.
            </p>
            <p className={styles.infoBody}>
              We've invested over $50K in Black-owned vendors, connected 12,000+ professionals,
              and partnered with 40+ ERGs nationwide. With your support, we can do more.
            </p>
          </div>

          {/* Right: Where Your Money Goes */}
          <div className={styles.whereMoneyGoes}>
            <span className={styles.sectionLabelDark}>WHERE YOUR MONEY GOES</span>
            <h2 className={styles.infoHeading}>Transparent Impact</h2>
            <div className={styles.allocationList}>
              {allocationItems.map((item) => (
                <div key={item.label} className={styles.allocationItem}>
                  <span className={styles.allocationPercent}>{item.percent}</span>
                  <span className={styles.allocationLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Donation Form — Donorbox */}
      <section className={styles.donateSection}>
        <div className={styles.donateInner}>
          <span className={styles.sectionLabelDark}>MAKE A DONATION</span>
          <h2 className={styles.donateHeading}>Ready to Make an Impact?</h2>
          <p className={styles.donateBody}>
            Your tax-deductible contribution empowers Black professionals through mentorship,
            resources, and community. Choose your amount below.
          </p>
          <DonorboxEmbed />
          <p className={styles.donateNote}>
            Powered by Donorbox. Secure, encrypted payment processing.
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <Newsletter />

    </main>
  );
}
