import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e3dbd8',
  borderRadius: '8px',
  padding: '20px 24px',
  minWidth: '140px',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: '16px',
  marginTop: '20px',
};

const statNumberStyle = {
  fontSize: '2rem',
  fontWeight: '700',
  color: '#8b3223',
  lineHeight: 1,
};

const statLabelStyle = {
  fontSize: '0.8rem',
  color: '#6b5752',
  marginTop: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: '600',
};

const sectionTitleStyle = {
  fontSize: '0.7rem',
  fontWeight: '700',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#9c8a86',
  marginBottom: '10px',
  marginTop: '32px',
};

const activityCardStyle = {
  background: '#ffffff',
  border: '1px solid #e3dbd8',
  borderRadius: '8px',
  padding: '20px 24px',
  color: '#9c8a86',
  fontSize: '0.875rem',
  fontStyle: 'italic',
};

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

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#191110', margin: 0 }}>
        Welcome back, {firstName}
      </h1>
      <p style={{ color: '#6b5752', marginTop: '6px', fontSize: '0.9rem' }}>
        Here's a quick overview of your content.
      </p>

      <div style={statsGridStyle}>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{fmt(stats.pages)}</div>
          <div style={statLabelStyle}>Pages</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{fmt(stats.events)}</div>
          <div style={statLabelStyle}>Events</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{fmt(stats.media)}</div>
          <div style={statLabelStyle}>Media Items</div>
        </div>
      </div>

      <div style={sectionTitleStyle}>Recent Activity</div>
      <div style={activityCardStyle}>
        Activity feed coming soon.
      </div>
    </div>
  );
}
