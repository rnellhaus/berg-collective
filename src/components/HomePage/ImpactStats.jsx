import styles from './ImpactStats.module.css';

const STATS = [
  {
    num:   '12K+',
    label: 'Professionals Engaged',
    desc:  'Black professionals across 15 signature events in 2025',
  },
  {
    num:   '40+',
    label: 'Corporate ERG Partners',
    desc:  'Spanning tech, sports, media, and finance',
  },
  {
    num:   '$50K+',
    label: 'Invested in Black-Owned Businesses',
    desc:  '90% vendor utilization rate across all events',
  },
  {
    num:   '5',
    label: 'Cities Activated',
    desc:  'NYC, LA, Houston, Fort Lauderdale, Cape Town',
  },
];

export default function ImpactStats() {
  return (
    <section className={styles.section} aria-labelledby="impact-stats-heading">
      <div className="container">
        <span className="section-label">2025 Year in Review</span>
        <h2 id="impact-stats-heading" className={styles.heading}>
          The numbers speak<br />for themselves.
        </h2>

        <div className={styles.grid} role="list" aria-label="Impact statistics">
          {STATS.map(({ num, label, desc }) => (
            <div key={label} className={styles.card} role="listitem">
              <span className={styles.num}>{num}</span>
              <span className={styles.label}>{label}</span>
              <span className={styles.desc}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
