import { Link } from 'react-router-dom';
import styles from './FooterNew.module.css';

const FOOTER_COLS = [
  {
    heading: 'Organization',
    links: [
      { label: 'About Us',       to: '/about' },
      { label: 'Impact Report',  to: '/impact' },
      { label: 'Our Chapters',   to: '/chapters' },
      { label: 'Leadership',     to: '/about#leadership' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Programs',         to: '/programs' },
      { label: 'Mentorship',       to: '/programs#mentorship' },
      { label: 'Career Resources', to: '/programs#career' },
      { label: 'Events',           to: '/events' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { label: 'Contact Us',              to: '/contact' },
      { label: 'rich@bergcollective.org', to: 'mailto:rich@bergcollective.org', external: true },
    ],
  },
];

export default function FooterNew() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={`${styles.top} container`}>
        <div className={styles.brand}>
          <Link to="/" aria-label="BERG Collective home">
            <img src="/images/logo-black.png" alt="BERG Collective" className={styles.logo} style={{ filter: 'brightness(0) invert(1)' }} />
          </Link>
          <p className={styles.tagline}>
            Empowering Black excellence through leadership development, career
            advancement, and community building across industries.
          </p>
          <div className={styles.social}>
            <a href="https://www.linkedin.com/company/berg-collective" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink}>in</a>
            <a href="https://www.instagram.com/bergcollective" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink}>ig</a>
            <a href="https://twitter.com/bergcollective" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className={styles.socialLink}>𝕏</a>
          </div>
        </div>

        {FOOTER_COLS.map((col) => (
          <div key={col.heading} className={styles.col}>
            <h4 className={styles.colHeading}>{col.heading}</h4>
            <ul className={styles.colList}>
              {col.links.map(({ label, to, external }) => (
                <li key={to}>
                  {external ? (
                    <a href={to} className={styles.colLink}>{label}</a>
                  ) : (
                    <Link to={to} className={styles.colLink}>{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`${styles.bottom} container`}>
        <p className={styles.copy}>© {new Date().getFullYear()} BERG Collective. All rights reserved.</p>
        <div className={styles.legal}>
          <Link to="/privacy" className={styles.legalLink}>Privacy Policy</Link>
          <Link to="/terms" className={styles.legalLink}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
