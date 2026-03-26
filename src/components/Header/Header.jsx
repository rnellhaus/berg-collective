import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

const navLinks = [
  { to: '/about', label: 'About' },
  { to: '/programs', label: 'Programs' },
  { to: '/chapters', label: 'Chapters' },
  { to: '/events', label: 'Events' },
  { to: '/impact', label: 'Impact' },
  { to: '/donate', label: 'Donate' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className={styles.header} role="banner">
      <div className={styles.headerInner}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo}>
            <img src="/images/logo.png" alt="BERG Collective" />
          </Link>

          <div className={styles.desktopNav}>
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                aria-current={location.pathname.startsWith(to) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className={styles.actions}>
            <a
              href="https://www.bergcollective.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.portalLink}
            >
              Member Portal
            </a>
            <Link to="/join" className={styles.joinBtn}>Join Now</Link>
            <button
              className={styles.mobileToggle}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#191110" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </nav>
      </div>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.active : ''}`}>
        {navLinks.map(({ to, label }) => (
          <Link key={to} to={to} onClick={() => setMenuOpen(false)}>
            {label}
          </Link>
        ))}
        <hr />
        <a
          href="https://www.bergcollective.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#8b3223', fontWeight: 600 }}
        >
          Member Portal →
        </a>
        <Link
          to="/join"
          className={styles.joinBtn}
          style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
          onClick={() => setMenuOpen(false)}
        >
          Join Now
        </Link>
      </div>
    </header>
  );
}
