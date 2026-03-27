import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { label: 'About',      to: '/about' },
  { label: 'Programs',   to: '/programs' },
  { label: 'Chapters',   to: '/chapters' },
  { label: 'Events',     to: '/events' },
  { label: 'Membership', to: '/membership' },
  { label: 'Impact',        to: '/impact' },
  { label: 'Partnerships',  to: '/partnerships' },
  { label: 'Newsletter',    to: '/newsletter' },
  { label: 'Donate',     to: '/donate' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`} role="banner">
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} aria-label="BERG Collective home">
          <img src="/images/logo-black.png" alt="BERG Collective" style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>

        <ul className={styles.links}>
          {NAV_LINKS.map(({ label, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <Link to="/membership" className={styles.cta}>
          Partner With Us
        </Link>

        <button
          className={styles.hamburger}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
        </button>
      </div>

      <div className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}>
        <ul className={styles.drawerLinks}>
          {NAV_LINKS.map(({ label, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={styles.drawerLink}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <Link
              to="/membership"
              className={styles.drawerCta}
              onClick={() => setMenuOpen(false)}
            >
              Partner With Us
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
