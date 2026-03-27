import Button from '../../components/Button/Button';
import styles from './JoinPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const tiers = [
  {
    id: 'growing',
    name: 'Growing',
    tagline: 'For emerging ERGs',
    highlighted: false,
    features: [
      'Community access',
      'Resource library',
      'Quarterly events',
      'BERG network directory',
    ],
    cta: 'Apply Now',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
  {
    id: 'established',
    name: 'Established',
    tagline: 'For active ERGs with 50+ members',
    highlighted: true,
    features: [
      'Everything in Growing',
      'Dedicated chapter support',
      'Annual summit access',
      'Mentorship matching',
      'Priority event access',
    ],
    cta: 'Apply Now',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For Fortune 500 ERGs',
    highlighted: false,
    features: [
      'Everything in Established',
      'Custom programming',
      'Executive roundtables',
      'Board placement pipeline',
      'White-glove onboarding',
    ],
    cta: 'Contact Us',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
];

const steps = [
  { number: '01', title: 'Apply', desc: 'Submit your ERG details' },
  { number: '02', title: 'Interview', desc: 'Meet with our team' },
  { number: '03', title: 'Confirm Tier', desc: 'Select the right fit' },
  { number: '04', title: 'Join', desc: 'Welcome to BERG' },
];

export default function JoinPage() {
  usePageMeta('Membership', 'ERG membership built for impact. Join the BERG Collective.');
  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.sectionLabel}>MEMBERSHIP</span>
          <h1 className={styles.heroTitle}>Built for ERGs. Designed for Impact.</h1>
          <p className={styles.heroSubtitle}>
            BERG Collective membership gives your ERG the structure, support, and community
            to drive real change inside your organization and beyond.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className={styles.tiersSection}>
        <div className={styles.tiersInner}>
          <div className={styles.tiersGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`${styles.tierCard} ${tier.highlighted ? styles.tierHighlighted : ''}`}
              >
                {tier.highlighted && (
                  <span className={styles.tierBadge}>Most Popular</span>
                )}
                <div className={styles.tierHeader}>
                  <h3 className={styles.tierName}>{tier.name}</h3>
                  <p className={styles.tierTagline}>{tier.tagline}</p>
                </div>
                <ul className={styles.featureList}>
                  {tier.features.map((feature) => (
                    <li key={feature} className={styles.featureItem}>
                      <svg
                        className={styles.checkIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17L4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className={styles.tierCta}>
                  <a
                    href={tier.ctaHref}
                    className={`${styles.ctaBtn} ${tier.highlighted ? styles.ctaBtnGold : styles.ctaBtnOutline}`}
                  >
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howSection}>
        <div className={styles.howInner}>
          <span className={styles.sectionLabel}>THE PROCESS</span>
          <h2 className={styles.howTitle}>How It Works</h2>
          <div className={styles.stepsRow}>
            {steps.map((step, i) => (
              <div key={step.number} className={styles.stepWrapper}>
                <div className={styles.stepItem}>
                  <div className={styles.stepCircle}>{step.number}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className={styles.stepConnector} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Individual Membership Callout */}
      <section className={styles.callout}>
        <div className={styles.calloutInner}>
          <h2 className={styles.calloutTitle}>Individual Membership Coming in 2026</h2>
          <p className={styles.calloutSub}>Join our waitlist to be the first to know.</p>
          <a href="mailto:rich@bergcollective.org" className={styles.calloutBtn}>
            Join Waitlist
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Elevate Your ERG?</h2>
          <a href="mailto:rich@bergcollective.org" className={styles.ctaGoldBtn}>
            Apply for ERG Membership
          </a>
        </div>
      </section>

    </main>
  );
}
