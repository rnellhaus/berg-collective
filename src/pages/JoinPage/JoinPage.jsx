import Button from '../../components/Button/Button';
import styles from './JoinPage.module.css';

const tiers = [
  {
    id: 'community',
    name: 'Community',
    price: 'Free',
    priceNote: 'forever',
    badge: null,
    accent: false,
    features: [
      'Events calendar access',
      'Monthly newsletter',
      'Community forum',
      'Public resource library',
    ],
    cta: 'Join Free',
    ctaVariant: 'outline',
    ctaTo: '/contact',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$50',
    priceNote: '/month',
    badge: 'Most Popular',
    accent: false,
    features: [
      'Everything in Community',
      '1-on-1 mentorship matching',
      'Exclusive workshops',
      'Chapter access nationwide',
      '20% event discounts',
    ],
    cta: 'Get Started',
    ctaVariant: 'primary',
    ctaTo: '/contact',
  },
  {
    id: 'executive',
    name: 'Executive',
    price: '$150',
    priceNote: '/month',
    badge: null,
    accent: true,
    features: [
      'Everything in Professional',
      'C-suite mentorship program',
      'Board placement assistance',
      'VIP event access',
      'Annual executive retreat',
    ],
    cta: 'Apply Now',
    ctaVariant: 'primary',
    ctaTo: '/contact',
  },
];

export default function JoinPage() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Become a{' '}
            <span className={styles.primary}>Member</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Unlock access to a powerful network of Black professionals, mentorship opportunities,
            exclusive events, and resources designed to accelerate your growth.
          </p>
        </div>
      </section>

      {/* Tier Grid */}
      <section className={styles.tiersSection}>
        <div className={styles.tiersInner}>
          <div className={styles.tiersGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`${styles.tierCard} ${tier.accent ? styles.tierAccent : ''} ${tier.badge ? styles.tierFeatured : ''}`}
              >
                {tier.badge && (
                  <span className={styles.tierBadge}>{tier.badge}</span>
                )}
                <div className={styles.tierHeader}>
                  <h3 className={styles.tierName}>{tier.name}</h3>
                  <div className={styles.tierPricing}>
                    <span className={styles.tierPrice}>{tier.price}</span>
                    <span className={styles.tierNote}>{tier.priceNote}</span>
                  </div>
                </div>
                <ul className={styles.featureList}>
                  {tier.features.map((feature) => (
                    <li key={feature} className={styles.featureItem}>
                      <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17L4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className={styles.tierCta}>
                  <Button to={tier.ctaTo} variant={tier.accent ? 'white' : tier.ctaVariant}>
                    {tier.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Not Sure Which Tier Is Right for You?</h2>
          <p className={styles.ctaDesc}>
            Reach out and our team will help you find the membership that best fits your goals.
          </p>
          <Button to="/contact" variant="primary">Talk to Us</Button>
        </div>
      </section>
    </main>
  );
}
