const PLATFORMS = [
  { value: 'luma', label: 'Lu.ma' },
  { value: 'eventbrite', label: 'Eventbrite' },
  { value: 'google_form', label: 'Google Form' },
  { value: 'custom', label: 'Custom URL' },
];

const STRATEGY_INFO = {
  luma: 'Native checkout overlay — best UX',
  eventbrite: 'Opens in new tab (Eventbrite blocks iframes)',
  google_form: 'Iframe lightbox on your site',
  custom: 'Iframe lightbox on your site',
};

// Domains that block iframe embedding
const BLOCKED_DOMAINS = [
  'eventbrite.com', 'ticketapp.org', 'ticketmaster.com', 'axs.com',
  'dice.fm', 'seetickets.com', 'stubhub.com', 'partiful.com',
];

function getStrategyHint(platform, url) {
  const base = STRATEGY_INFO[platform] || 'Opens in new tab';
  if (platform === 'custom' && url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
        return `Opens in new tab — ${hostname} blocks iframe embedding`;
      }
    } catch {}
  }
  return base;
}

const containerStyle = {
  border: '1px solid #e8e1da',
  borderRadius: '8px',
  padding: '20px',
  background: '#ffffff',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#8e5f57',
  marginBottom: '10px',
};

const platformRowStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '16px',
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #e8e1da',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#191110',
  background: '#fbfaf9',
  boxSizing: 'border-box',
  outline: 'none',
};

const helpTextStyle = {
  fontSize: '0.775rem',
  color: '#8e5f57',
  marginTop: '5px',
};

const infoBoxStyle = {
  marginTop: '14px',
  padding: '10px 14px',
  background: '#F5EFDB',
  borderRadius: '6px',
  fontSize: '0.825rem',
  color: '#6b4c10',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export default function RsvpConfig({ platform, url, eventId, onChange }) {
  const activePlatform = platform || 'luma';

  function handlePlatformChange(val) {
    onChange({ platform: val, url: url || '', eventId: eventId || '' });
  }

  function handleUrlChange(e) {
    onChange({ platform: activePlatform, url: e.target.value, eventId: eventId || '' });
  }

  function handleEventIdChange(e) {
    onChange({ platform: activePlatform, url: url || '', eventId: e.target.value });
  }

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>RSVP / Registration</div>

      <div style={platformRowStyle}>
        {PLATFORMS.map((p) => {
          const isActive = activePlatform === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePlatformChange(p.value)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: isActive ? '2px solid #8b3223' : '1px solid #e8e1da',
                background: isActive ? '#fff5f3' : '#ffffff',
                color: isActive ? '#8b3223' : '#8e5f57',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {activePlatform === 'luma' ? (
        <div>
          <label style={helpTextStyle}>
            <strong style={{ color: '#191110', fontWeight: '600' }}>Lu.ma Event ID</strong>
          </label>
          <input
            type="text"
            value={eventId || ''}
            onChange={handleEventIdChange}
            placeholder="e.g. evt-abc123xyz"
            style={{ ...inputStyle, marginTop: '6px' }}
          />
          <div style={helpTextStyle}>
            Find the event ID in your Lu.ma dashboard URL — it starts with <code>evt-</code>.
          </div>
        </div>
      ) : (
        <div>
          <label style={helpTextStyle}>
            <strong style={{ color: '#191110', fontWeight: '600' }}>Registration URL</strong>
          </label>
          <input
            type="url"
            value={url || ''}
            onChange={handleUrlChange}
            placeholder="https://..."
            style={{ ...inputStyle, marginTop: '6px' }}
          />
        </div>
      )}

      {activePlatform && (
        <div style={infoBoxStyle}>
          <span style={{ fontSize: '1rem' }}>ℹ</span>
          {getStrategyHint(activePlatform, url)}
        </div>
      )}
    </div>
  );
}
