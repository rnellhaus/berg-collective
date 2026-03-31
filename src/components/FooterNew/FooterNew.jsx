import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './FooterNew.module.css';

const FOOTER_COLS = [
  {
    heading: 'Organization',
    links: [
      { label: 'About Us',       to: '/about' },
      { label: 'Impact Report',  to: '/impact' },
      { label: 'Partnerships',   to: '/partnerships' },
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
      { label: 'Volunteer',              to: '/volunteer' },
      { label: 'Contact Us',              to: '/contact' },
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
            <img src="/images/logo.png" alt="BERG Collective" className={styles.logo} style={{ filter: 'brightness(0) invert(1)' }} />
          </Link>
          <p className={styles.tagline}>
            Empowering Black excellence through leadership development, career
            advancement, and community building across industries.
          </p>
          <div className={styles.social}>
            <a href="https://www.linkedin.com/company/berg-collective2" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink} style={{ background: '#0A66C2', borderColor: '#0A66C2' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://www.instagram.com/bergcollective" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink} style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)', borderColor: '#d6249f' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@berg.collective" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={styles.socialLink} style={{ background: '#1a1a1a', border: '1px solid #69C9D0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.2V12a4.85 4.85 0 01-5.58-2.2V2h3.45a4.83 4.83 0 002.13 4.69z" fill="#69C9D0"/>
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.2V12a4.85 4.85 0 01-5.58-2.2V2h3.45a4.83 4.83 0 002.13 4.69z" fill="#EE1D52" style={{ transform: 'translate(-1px, -1px)' }}/>
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.2V12a4.85 4.85 0 01-5.58-2.2V2h3.45a4.83 4.83 0 002.13 4.69z" fill="#fff"/>
              </svg>
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
