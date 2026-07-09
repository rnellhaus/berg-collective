import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './EventsListPage.module.css';

const RSVP_LABELS = {
  luma: 'Lu.ma',
  eventbrite: 'Eventbrite',
  google_form: 'Google Form',
  custom: 'Custom URL',
};

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

function DateBadge({ dateStr }) {
  const d = parseEventDate(dateStr);
  if (!d) {
    return (
      <div className={`${styles.dateBadge} ${styles.dateBadgeEmpty}`}>
        <span className={styles.dateDay}>—</span>
      </div>
    );
  }
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return (
    <div className={styles.dateBadge}>
      <span className={styles.dateMonth}>{month}</span>
      <span className={styles.dateDay}>{day}</span>
    </div>
  );
}

function TabButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.tab}${active ? ` ${styles.tabActive}` : ''}`}
    >
      {label}
      <span className={styles.tabCount}>{count}</span>
    </button>
  );
}

export default function EventsListPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [drafts, setDrafts] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicating, setDuplicating] = useState(null);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const [draftRes, upRes, pastRes] = await Promise.all([
        apiFetch('/api/events?status=draft'),
        apiFetch('/api/events?status=upcoming'),
        apiFetch('/api/events?status=past'),
      ]);
      if (!draftRes.ok) throw new Error(`HTTP ${draftRes.status}`);
      if (!upRes.ok) throw new Error(`HTTP ${upRes.status}`);
      if (!pastRes.ok) throw new Error(`HTTP ${pastRes.status}`);
      const draftData = await draftRes.json();
      const upData = await upRes.json();
      const pastData = await pastRes.json();
      setDrafts(Array.isArray(draftData) ? draftData : draftData.events ?? []);
      setUpcoming(Array.isArray(upData) ? upData : upData.events ?? []);
      setPast(Array.isArray(pastData) ? pastData : pastData.events ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [apiFetch]);

  async function handleDuplicate(eventId) {
    setDuplicating(eventId);
    try {
      const res = await apiFetch(`/api/events/${eventId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await loadEvents();
      navigate(`/admin/events/${data.event.id}`);
    } catch (err) {
      setError('Failed to duplicate: ' + err.message);
    } finally {
      setDuplicating(null);
    }
  }

  const events = tab === 'draft' ? drafts : tab === 'upcoming' ? upcoming : past;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Events</h1>
          <p className={styles.subtitle}>Create and manage BERG events, RSVPs, and photos.</p>
        </div>
        <Link to="/admin/events/new" className={styles.primaryBtn}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          New Event
        </Link>
      </header>

      <div className={styles.tabBar} role="tablist">
        <TabButton
          label="Drafts"
          count={drafts.length}
          active={tab === 'draft'}
          onClick={() => setTab('draft')}
        />
        <TabButton
          label="Upcoming"
          count={upcoming.length}
          active={tab === 'upcoming'}
          onClick={() => setTab('upcoming')}
        />
        <TabButton
          label="Past"
          count={past.length}
          active={tab === 'past'}
          onClick={() => setTab('past')}
        />
      </div>

      {loading && <p className={styles.stateMsg}>Loading events…</p>}

      {error && <p className={styles.errorMsg}>Failed to load events: {error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
          <p>No {tab} events found.</p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className={styles.listCard}>
          {events.map((event) => (
            <div key={event.id} className={styles.row}>
              <DateBadge dateStr={event.date} />

              <div className={styles.rowMain}>
                <Link to={`/admin/events/${event.id}`} className={styles.rowTitle}>
                  {event.title || 'Untitled Event'}
                </Link>
                <div className={styles.rowMeta}>
                  {[event.location, event.time].filter(Boolean).join(' · ')}
                </div>
              </div>

              <div className={styles.pills}>
                {event.rsvp_strategy && (
                  <span className={styles.rsvpPill}>
                    {RSVP_LABELS[event.rsvp_strategy] || event.rsvp_strategy}
                  </span>
                )}
                {typeof event.photo_count === 'number' && (
                  <span className={styles.photoPill}>
                    {event.photo_count} photo{event.photo_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className={styles.rowActions}>
                <button
                  onClick={() => handleDuplicate(event.id)}
                  disabled={duplicating === event.id}
                  className={styles.iconBtn}
                  title="Duplicate this event"
                  aria-label="Duplicate this event"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {duplicating === event.id ? 'hourglass_top' : 'content_copy'}
                  </span>
                </button>
                <Link to={`/admin/events/${event.id}`} className={styles.editLink}>
                  Edit
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
