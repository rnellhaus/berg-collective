import styles from './SectionHeader.module.css';

export default function SectionHeader({ eyebrow, title, centered = true }) {
  return (
    <div className={`${styles.header} ${centered ? styles.centered : ''}`}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2 className={styles.title}>{title}</h2>
    </div>
  );
}
