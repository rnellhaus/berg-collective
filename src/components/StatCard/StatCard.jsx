import styles from './StatCard.module.css';

export default function StatCard({ number, label, description }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.number}>{number}</h3>
      <p className={styles.label}>{label}</p>
      {description && <p className={styles.desc}>{description}</p>}
    </div>
  );
}
