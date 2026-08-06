import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './BingoAdmin.module.css';

const STATUS_LABELS = {
  draft: 'Draft',
  registration: 'Registration open',
  live: 'Live now',
  paused: 'Paused',
  ended: 'Ended',
  archived: 'Archived',
};

function formatEventDate(value) {
  if (!value) return 'Date to be announced';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BingoGamesPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState({
    event_id: '',
    title: '',
    join_code: '',
    prompt_count: 12,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gamesRes, upcomingRes, draftRes] = await Promise.all([
        apiFetch('/api/bingo/admin/games'),
        apiFetch('/api/events?status=upcoming'),
        apiFetch('/api/events?status=draft'),
      ]);
      if (!gamesRes.ok) throw new Error('Could not load bingo games');
      const gamesData = await gamesRes.json();
      const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { events: [] };
      const draftData = draftRes.ok ? await draftRes.json() : { events: [] };
      setGames(gamesData.games || []);
      const combined = [...(upcomingData.events || []), ...(draftData.events || [])];
      const unique = [...new Map(combined.map((event) => [event.id, event])).values()];
      setEvents(unique);
    } catch (loadError) {
      setError(loadError.message || 'Could not load networking bingo');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const requestedEventId = searchParams.get('event');
    if (!requestedEventId || events.length === 0) return;
    const selected = events.find((event) => String(event.id) === requestedEventId);
    if (!selected) return;
    setShowCreate(true);
    setForm((current) => ({
      ...current,
      event_id: requestedEventId,
      title: current.title || `${selected.title} — Networking Bingo`,
    }));
  }, [events, searchParams]);

  const filteredGames = useMemo(() => {
    if (filter === 'all') return games;
    if (filter === 'active') {
      return games.filter((game) => ['registration', 'live', 'paused'].includes(game.status));
    }
    return games.filter((game) => game.status === filter);
  }, [filter, games]);

  function chooseEvent(eventId) {
    const event = events.find((item) => String(item.id) === String(eventId));
    setForm((current) => ({
      ...current,
      event_id: eventId,
      title: current.title || (event ? `${event.title} — Networking Bingo` : ''),
    }));
  }

  async function createGame(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      const response = await apiFetch('/api/bingo/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          event_id: Number(form.event_id),
          prompt_count: Number(form.prompt_count),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not create game');
      navigate(`/admin/bingo/${data.game.id}`);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Event engagement</span>
          <h1 className={styles.pageTitle}>Networking Bingo</h1>
          <p className={styles.pageSubtitle}>
            Turn a room full of attendees into measurable, meaningful connections.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setShowCreate((value) => !value)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {showCreate ? 'close' : 'add'}
          </span>
          {showCreate ? 'Close' : 'Create game'}
        </button>
      </header>

      {showCreate && (
        <form className={styles.createPanel} onSubmit={createGame}>
          <div className={styles.createSignal} aria-hidden="true">
            <span>01</span>
            <div />
          </div>
          <div className={styles.createContent}>
            <div className={styles.sectionHeadingRow}>
              <div>
                <span className={styles.darkEyebrow}>New game</span>
                <h2>Choose the room.</h2>
              </div>
              <p>We will start you with 12 editable BERG conversation prompts.</p>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Event</span>
                <select
                  value={form.event_id}
                  onChange={(event) => chooseEvent(event.target.value)}
                  required
                >
                  <option value="">Select an event</option>
                  {events.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {formatEventDate(item.date)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Game title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))}
                  placeholder="Summer Mixer — Networking Bingo"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Join code <em>optional</em></span>
                <input
                  value={form.join_code}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    join_code: event.target.value.toUpperCase(),
                  }))}
                  placeholder="SUMMER26"
                />
              </label>
              <label className={styles.field}>
                <span>Prompts per player</span>
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={form.prompt_count}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    prompt_count: event.target.value,
                  }))}
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.goldButton} disabled={creating}>
                {creating ? 'Building game…' : 'Build the game'}
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filterBar} aria-label="Filter games">
        {[
          ['active', 'Active'],
          ['draft', 'Drafts'],
          ['ended', 'Ended'],
          ['all', 'All games'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={filter === value ? styles.filterActive : ''}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>
              {value === 'all'
                ? games.length
                : value === 'active'
                  ? games.filter((game) => ['registration', 'live', 'paused'].includes(game.status)).length
                  : games.filter((game) => game.status === value).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingCard}>Loading the room…</div>
      ) : filteredGames.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyMark}>B</div>
          <div>
            <h2>No games here yet.</h2>
            <p>Create the first networking game for an upcoming BERG event.</p>
          </div>
        </div>
      ) : (
        <div className={styles.gameList}>
          {filteredGames.map((game) => (
            <article className={styles.gameCard} key={game.id}>
              <div className={`${styles.statusRail} ${styles[`status_${game.status}`]}`} />
              <div className={styles.gameCardMain}>
                <div className={styles.gameCardTopline}>
                  <span className={`${styles.statusPill} ${styles[`status_${game.status}`]}`}>
                    {STATUS_LABELS[game.status] || game.status}
                  </span>
                  <span className={styles.eventDate}>{formatEventDate(game.event_date)}</span>
                </div>
                <h2>
                  <Link to={`/admin/bingo/${game.id}`}>{game.title}</Link>
                </h2>
                <p>{game.event_title}</p>
                <div className={styles.codeLine}>
                  <span>Game code</span>
                  <strong>{game.join_code}</strong>
                </div>
              </div>
              <div className={styles.gameMetrics}>
                <div><strong>{game.player_count}</strong><span>Players</span></div>
                <div><strong>{game.connection_count}</strong><span>Connections</span></div>
                <div><strong>{game.finisher_count}</strong><span>Finishers</span></div>
              </div>
              <div className={styles.gameActions}>
                {['live', 'paused', 'registration', 'ended'].includes(game.status) && (
                  <Link className={styles.liveLink} to={`/admin/bingo/${game.id}/live`}>
                    <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>
                    Live view
                  </Link>
                )}
                <Link className={styles.editLink} to={`/admin/bingo/${game.id}`}>
                  Manage
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
