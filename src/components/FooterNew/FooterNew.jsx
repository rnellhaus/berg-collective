import { useState } from 'react';
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
      { label: 'Donate',                   to: '/donate' },
      { label: 'Contact Us',              to: '/contact' },
      { label: 'rich@bergcollective.org', to: 'mailto:rich@bergcollective.org', external: true },
    ],
  },
];

export default function FooterNew() {
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState('idle');

  async function handleNewsletter(e) {
    e.preventDefault();
    if (!nlEmail) return;
    setNlStatus('submitting');
    try {
      await fetch('/api/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nlEmail, list: 'nyc' }),
      });
      window.open('http://eepurl.com/iCmefM', '_blank');
      setNlStatus('success');
    } catch {
      setNlStatus('error');
    }
  }

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
            <a href="https://www.linkedin.com/company/berg-collective2" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink}>in</a>
            <a href="https://www.instagram.com/bergcollective" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink}>ig</a>
<a href="https://www.tiktok.com/@berg.collective" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={styles.socialLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.2V12a4.85 4.85 0 01-5.58-2.2V2h3.45a4.83 4.83 0 002.13 4.69z"/></svg>
            </a>
          </div>

          {/* Footer newsletter signup */}
          <div className={styles.newsletter}>
            <h4 className={styles.nlHeading}>Stay Connected</h4>
            {nlStatus === 'success' ? (
              <p className={styles.nlSuccess}>You're in! Check the tab that opened to confirm.</p>
            ) : (
              <form className={styles.nlForm} onSubmit={handleNewsletter}>
                <input
                  type="email"
                  className={styles.nlInput}
                  placeholder="Your email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  required
                  aria-label="Newsletter email"
                />
                <button type="submit" className={styles.nlBtn} disabled={nlStatus === 'submitting'}>
                  {nlStatus === 'submitting' ? '...' : 'Join'}
                </button>
              </form>
            )}
            {nlStatus === 'error' && <p className={styles.nlError}>Try again</p>}
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
