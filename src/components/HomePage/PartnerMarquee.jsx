import styles from './PartnerMarquee.module.css';

const PARTNERS = [
  'Google', 'Disney', 'NFL', 'Netflix', 'Betterment',
  'TikTok', 'LinkedIn', 'Amazon', 'Meta', 'Microsoft',
  'Spotify', 'PepsiCo', 'Adobe', 'Warner Bros.',
];

export default function PartnerMarquee() {
  return (
    <div className={styles.bar} aria-label="Partner organizations">
      <p className={styles.label}>Trusted by 40+ leading organizations</p>
      <div className={styles.track} aria-hidden="true">
        {/* Duplicate list for seamless infinite scroll */}
        {[...PARTNERS, ...PARTNERS].map((name, i) => (
          <span key={i} className={styles.name}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
