import styles from './RsvpConfig.module.css';

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
    } catch { /* invalid URL — fall through to base label */ }
  }
  return base;
}

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
    <div className={styles.card}>
      <div className={styles.cardLabel}>RSVP / Registration</div>

      <div className={styles.platformRow}>
        {PLATFORMS.map((p) => {
          const isActive = activePlatform === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePlatformChange(p.value)}
              className={`${styles.platformBtn}${isActive ? ` ${styles.platformBtnActive}` : ''}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {activePlatform === 'luma' ? (
        <div>
          <label className={styles.fieldLabel}>Lu.ma Event ID</label>
          <input
            type="text"
            value={eventId || ''}
            onChange={handleEventIdChange}
            placeholder="e.g. evt-abc123xyz"
            className={styles.input}
          />
          <div className={styles.helpText}>
            Find the event ID in your Lu.ma dashboard URL — it starts with <code>evt-</code>.
          </div>
        </div>
      ) : (
        <div>
          <label className={styles.fieldLabel}>Registration URL</label>
          <input
            type="url"
            value={url || ''}
            onChange={handleUrlChange}
            placeholder="https://..."
            className={styles.input}
          />
        </div>
      )}

      {activePlatform && (
        <div className={styles.infoBox}>
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          {getStrategyHint(activePlatform, url)}
        </div>
      )}
    </div>
  );
}
