import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './AdminLayout.module.css';

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

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const initials = getInitials(user);
  const displayName = user?.name || user?.email || '';

  return (
    <div className={styles.shell}>
      {/* Top Bar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.brandName}>BERG</span>
          <span className={styles.cmsBadge}>CMS</span>
        </div>
        <div className={styles.topbarRight}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.liveSiteLink}
          >
            View Live Site ↗
          </a>
          <div className={styles.userMeta}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{displayName}</span>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className={styles.body}>
        {/* Sidebar */}
        <nav className={styles.sidebar} aria-label="Admin navigation">
          <div className={styles.sidebarSection}>
            <div className={styles.sectionLabel}>Content</div>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/pages"
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              Pages
            </NavLink>
            <NavLink
              to="/admin/events"
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              Events
            </NavLink>
            <NavLink
              to="/admin/media"
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
              }
            >
              Media Library
            </NavLink>
          </div>

          {user?.role === 'admin' && (
            <div className={styles.sidebarSection}>
              <div className={styles.sectionLabel}>Admin Only</div>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
                }
              >
                Users
              </NavLink>
              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  `${styles.navLink}${isActive ? ` ${styles.active}` : ''}`
                }
              >
                Settings
              </NavLink>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
