import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import styles from './DashboardPage.module.css';

const STAT_CARDS = [
  { key: 'pages', label: 'Pages', icon: 'web', to: '/admin/pages', action: 'Manage pages' },
  { key: 'events', label: 'Events', icon: 'event', to: '/admin/events', action: 'Manage events' },
  { key: 'media', label: 'Media items', icon: 'photo_library', to: '/admin/media', action: 'Open library' },
];

const QUICK_ACTIONS = [
  {
    to: '/admin/events/new',
    icon: 'add_circle',
    title: 'Create an event',
    sub: 'Draft a new event with RSVP and photos',
  },
  {
    to: '/admin/pages',
    icon: 'edit_note',
    title: 'Edit site pages',
    sub: 'Update content sections across the site',
  },
  {
    to: '/admin/media',
    icon: 'upload',
    title: 'Upload media',
    sub: 'Add images to the media library',
  },
  {
    to: '/admin/forms',
    icon: 'inbox',
    title: 'Review submissions',
    sub: 'See the latest form responses',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const firstName = user?.name?.split(' ')[0] || user?.email || 'there';

  const [stats, setStats] = useState({ pages: null, events: null, media: null });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [pagesRes, eventsRes, mediaRes] = await Promise.allSettled([
          apiFetch('/api/pages'),
          apiFetch('/api/events'),
          apiFetch('/api/media'),
        ]);

        const safeCount = async (result) => {
          if (result.status === 'fulfilled' && result.value.ok) {
            const data = await result.value.json().catch(() => null);
            if (Array.isArray(data)) return data.length;
            if (data && typeof data.total === 'number') return data.total;
            if (data && Array.isArray(data.items)) return data.items.length;
          }
          return null;
        };

        const [pages, events, media] = await Promise.all([
          safeCount(pagesRes),
          safeCount(eventsRes),
          safeCount(mediaRes),
        ]);

        setStats({ pages, events, media });
      } catch {
        // Stats are non-critical; fail silently
      }
    }

    fetchStats();
  }, [apiFetch]);

  const fmt = (n) => (n === null ? '—' : n);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {firstName}</h1>
          <p className={styles.subtitle}>{today}</p>
        </div>
        <Link to="/admin/events/new" className={styles.primaryBtn}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          New Event
        </Link>
      </header>

      <div className={styles.statsGrid}>
        {STAT_CARDS.map(({ key, label, icon, to, action }) => (
          <Link key={key} to={to} className={styles.statCard}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>{label}</span>
              <span className={`material-symbols-outlined ${styles.statIcon}`} aria-hidden="true">
                {icon}
              </span>
            </div>
            <div className={styles.statNumber}>{fmt(stats[key])}</div>
            <div className={styles.statAction}>
              {action}
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.sectionTitle}>Quick actions</div>
      <div className={styles.actionsGrid}>
        {QUICK_ACTIONS.map(({ to, icon, title, sub }) => (
          <Link key={title} to={to} className={styles.actionCard}>
            <div className={styles.actionIcon}>
              <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
            </div>
            <div className={styles.actionText}>
              <div className={styles.actionTitle}>{title}</div>
              <div className={styles.actionSub}>{sub}</div>
            </div>
            <span className={`material-symbols-outlined ${styles.actionArrow}`} aria-hidden="true">
              north_east
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
