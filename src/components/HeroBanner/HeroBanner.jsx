import styles from './HeroBanner.module.css';

export default function HeroBanner({ badge, title, subtitle, actions, children, centered = false, background }) {
  return (
    <section className={styles.hero} style={background ? { backgroundColor: background } : undefined}>
      <div className={`${styles.inner} ${centered ? styles.centered : ''}`}>
        {children ? children : (
          <div>
            {badge && <div className={styles.badge}>{badge}</div>}
            <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: title }} />
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {actions && <div className={styles.actions}>{actions}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
