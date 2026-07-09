import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './AdminLayout.module.css';

const CONTENT_NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'space_dashboard', end: true },
  { to: '/admin/pages', label: 'Pages', icon: 'web' },
  { to: '/admin/events', label: 'Events', icon: 'event' },
  { to: '/admin/forms', label: 'Forms', icon: 'inbox' },
  { to: '/admin/media', label: 'Media Library', icon: 'photo_library' },
  { to: '/admin/documents', label: 'Documents', icon: 'folder_open' },
];

const ADMIN_NAV = [
  { to: '/admin/users', label: 'Users', icon: 'group' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
];

function getInitials(user) {
  if (!user) return '??';
  const name = user.name || user.email || '';
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}

function NavItem({ to, label, icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
      }
    >
      <span className={`material-symbols-outlined ${styles.navIcon}`} aria-hidden="true">
        {icon}
      </span>
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const initials = getInitials(user);
  const displayName = user?.name || user?.email || '';
  const [menuOpen, setMenuOpen] = useState(false);
  // Close mobile menu on navigation
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={styles.shell}>
      {/* Mobile top bar */}
      <header className={styles.mobileBar}>
        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {menuOpen ? 'close' : 'menu'}
          </span>
        </button>
        <span className={styles.brandName}>BERG</span>
        <span className={styles.cmsBadge}>CMS</span>
      </header>

      {/* Sidebar */}
      <nav
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
        aria-label="Admin navigation"
      >
        <div className={styles.brand}>
          <span className={styles.brandName}>BERG</span>
          <span className={styles.cmsBadge}>CMS</span>
        </div>

        <div className={styles.navScroll}>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Content</div>
            {CONTENT_NAV.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={closeMenu} />
            ))}
          </div>

          {user?.role === 'admin' && (
            <div className={styles.sidebarSection}>
              <div className={styles.sectionLabel}>Admin</div>
              {ADMIN_NAV.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={closeMenu} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.liveSiteLink}
          >
            <span className={`material-symbols-outlined ${styles.navIcon}`} aria-hidden="true">
              open_in_new
            </span>
            View live site
          </a>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              {user?.role && <span className={styles.userRole}>{user.role}</span>}
            </div>
            <button
              className={styles.logoutBtn}
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
            >
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay for mobile menu */}
      {menuOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
