import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const RSVP_LABELS = {
  luma: 'Lu.ma',
  eventbrite: 'Eventbrite',
  google_form: 'Google Form',
  custom: 'Custom URL',
};

const containerStyle = {
  maxWidth: '860px',
};

const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
};

const headingStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#191110',
  margin: 0,
};

const newBtnStyle = {
  padding: '9px 18px',
  background: '#8b3223',
  color: '#ffffff',
  border: 'none',
  borderRadius: '7px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};

const tabBarStyle = {
  display: 'flex',
  gap: '4px',
  borderBottom: '2px solid #e8e1da',
  marginBottom: '20px',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '14px 16px',
  borderBottom: '1px solid #e8e1da',
  background: '#ffffff',
};

const dateBadgeStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '46px',
  minWidth: '46px',
  background: '#8b3223',
  color: '#ffffff',
  borderRadius: '7px',
  padding: '6px 0',
};

const pillStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: '600',
  background: '#F5EFDB',
  color: '#6b4c10',
};

const photoPillStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: '600',
  background: '#f5f1ee',
  color: '#8e5f57',
};

const editLinkStyle = {
  color: '#8b3223',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '0.875rem',
  marginLeft: 'auto',
  whiteSpace: 'nowrap',
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
  if (!d) return <div style={{ ...dateBadgeStyle, background: '#e8e1da' }}><span style={{ fontSize: '0.7rem', color: '#8e5f57' }}>—</span></div>;
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return (
    <div style={dateBadgeStyle}>
      <span style={{ fontSize: '1.1rem', fontWeight: '700', lineHeight: 1 }}>{day}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: '600', letterSpacing: '0.05em', marginTop: '2px' }}>{month}</span>
    </div>
  );
}

function TabButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: active ? '700' : '500',
        color: active ? '#8b3223' : '#8e5f57',
        borderBottom: active ? '2px solid #8b3223' : '2px solid transparent',
        marginBottom: '-2px',
        transition: 'color 0.15s',
      }}
    >
      {label}
      <span
        style={{
          marginLeft: '7px',
          background: active ? '#8b3223' : '#e8e1da',
          color: active ? '#ffffff' : '#8e5f57',
          borderRadius: '10px',
          fontSize: '0.7rem',
          fontWeight: '700',
          padding: '1px 7px',
          display: 'inline-block',
        }}
      >
        {count}
      </span>
    </button>
  );
}

export default function EventsListPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [upRes, pastRes] = await Promise.all([
          apiFetch('/api/events?status=upcoming'),
          apiFetch('/api/events?status=past'),
        ]);
        if (!upRes.ok) throw new Error(`HTTP ${upRes.status}`);
        if (!pastRes.ok) throw new Error(`HTTP ${pastRes.status}`);
        const upData = await upRes.json();
        const pastData = await pastRes.json();
        setUpcoming(Array.isArray(upData) ? upData : upData.events ?? []);
        setPast(Array.isArray(pastData) ? pastData : pastData.events ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  const events = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={containerStyle}>
      <div style={topBarStyle}>
        <h1 style={headingStyle}>Events</h1>
        <Link to="/admin/events/new" style={newBtnStyle}>
          + New Event
        </Link>
      </div>

      <div style={tabBarStyle}>
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

      {loading && (
        <p style={{ color: '#8e5f57', fontStyle: 'italic', marginTop: '24px' }}>Loading events…</p>
      )}

      {error && (
        <p style={{ color: '#8b3223', marginTop: '24px' }}>Failed to load events: {error}</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p style={{ color: '#8e5f57', fontStyle: 'italic', marginTop: '24px' }}>
          No {tab} events found.
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <div
          style={{
            border: '1px solid #e8e1da',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {events.map((event, i) => (
            <div
              key={event.id}
              style={{
                ...rowStyle,
                borderBottom: i === events.length - 1 ? 'none' : '1px solid #e8e1da',
              }}
            >
              <DateBadge dateStr={event.date} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: '#191110',
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.title || 'Untitled Event'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8e5f57' }}>
                  {[event.location, event.time].filter(Boolean).join(' · ')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {event.rsvp_strategy && (
                  <span style={pillStyle}>{RSVP_LABELS[event.rsvp_strategy] || event.rsvp_strategy}</span>
                )}
                {typeof event.photo_count === 'number' && (
                  <span style={photoPillStyle}>{event.photo_count} photo{event.photo_count !== 1 ? 's' : ''}</span>
                )}
              </div>

              <Link to={`/admin/events/${event.id}`} style={editLinkStyle}>
                Edit →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
