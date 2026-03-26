import styles from './DonutChart.module.css';

export default function DonutChart({ percentage = 85, label = 'To Programs' }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={styles.wrapper}>
      <svg width="160" height="160" viewBox="0 0 160 160" className={styles.chart} role="img" aria-label={`${percentage}% ${label}`}>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e8e1da" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={radius} fill="none" stroke="#8b3223" strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div className={styles.center}>
        <p className={styles.percentage}>{percentage}%</p>
        <p className={styles.label}>{label}</p>
      </div>
    </div>
  );
}
