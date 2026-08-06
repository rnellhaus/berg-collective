import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './BingoAdmin.module.css';

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BingoLivePage() {
  const { id } = useParams();
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerPage, setPlayerPage] = useState(0);
  const pollInFlight = useRef(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    // A 250-row dashboard payload can outlast the poll interval; skip rather
    // than queue so the control room never falls behind itself.
    if (quiet && pollInFlight.current) return;
    if (quiet) pollInFlight.current = true;
    if (!quiet) setLoading(true);
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/dashboard`);
      const next = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(next.error || 'Could not load dashboard');
      setData(next);
      setLastUpdated(new Date());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      pollInFlight.current = false;
      if (!quiet) setLoading(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data || !['live', 'paused', 'registration'].includes(data.game.status)) return undefined;
    const interval = window.setInterval(() => load({ quiet: true }), 5000);
    return () => window.clearInterval(interval);
  }, [data, load]);

  async function changeStatus(status) {
    setBusy(status);
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update game');
      await load({ quiet: true });
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setBusy('');
    }
  }

  async function setPlayerStatus(playerId, status) {
    setBusy(playerId);
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/players/${playerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update player');
      await load({ quiet: true });
    } catch (playerError) {
      setError(playerError.message);
    } finally {
      setBusy('');
    }
  }

  async function revokeConnection(connectionId) {
    if (!window.confirm('Revoke this connection and reopen the player’s prompt?')) return;
    setBusy(connectionId);
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/connections/${connectionId}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not revoke connection');
      await load({ quiet: true });
    } catch (connectionError) {
      setError(connectionError.message);
    } finally {
      setBusy('');
    }
  }

  const finishers = useMemo(
    () => (data?.players || []).filter((player) => player.finish_place),
    [data]
  );
  const podium = useMemo(
    () => finishers.filter((player) => player.finish_place <= 3),
    [finishers]
  );
  const topTenFinishers = useMemo(
    () => finishers.slice(0, 10),
    [finishers]
  );
  const connectors = useMemo(
    () => [...(data?.players || [])]
      .filter((player) => player.status === 'active')
      .sort((a, b) => b.completed_count - a.completed_count || new Date(a.joined_at) - new Date(b.joined_at))
      .slice(0, 10),
    [data]
  );

  // Paging keeps the DOM small at 250 players; search is what makes a specific
  // attendee findable when someone comes to the desk for help.
  const PLAYERS_PER_PAGE = 25;
  const filteredPlayers = useMemo(() => {
    const needle = playerQuery.trim().toLowerCase();
    const all = data?.players || [];
    if (!needle) return all;
    return all.filter((player) => [player.display_name, player.email, player.company]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(needle)));
  }, [data, playerQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE));
  const safePage = Math.min(playerPage, pageCount - 1);
  const visiblePlayers = filteredPlayers.slice(
    safePage * PLAYERS_PER_PAGE,
    safePage * PLAYERS_PER_PAGE + PLAYERS_PER_PAGE
  );

  if (loading) return <div className={styles.loadingCard}>Opening the control room…</div>;
  if (!data) return <div className={styles.errorBanner}>{error || 'Game not found'}</div>;

  const { game, stats, players, recent_connections: recentConnections } = data;

  return (
    <div className={`${styles.page} ${styles.livePage}`}>
      <header className={styles.liveHeader}>
        <div>
          <Link to={`/admin/bingo/${game.id}`} className={styles.backLink}>
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            Game setup
          </Link>
          <span className={styles.liveKicker}>
            <i className={game.status === 'live' ? styles.liveDot : styles.idleDot} />
            {game.status === 'live' ? 'Live control room' : `${game.status} control room`}
          </span>
          <h1>{game.title}</h1>
          <p>{game.event_title} · Code {game.join_code}</p>
        </div>
        <div className={styles.liveControls}>
          {game.status === 'registration' && (
            <button type="button" className={styles.goldButton} onClick={() => changeStatus('live')} disabled={!!busy}>
              <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
              Start game
            </button>
          )}
          {game.status === 'live' && (
            <button type="button" className={styles.goldButton} onClick={() => changeStatus('paused')} disabled={!!busy}>
              <span className="material-symbols-outlined" aria-hidden="true">pause</span>
              Pause
            </button>
          )}
          {game.status === 'paused' && (
            <button type="button" className={styles.goldButton} onClick={() => changeStatus('live')} disabled={!!busy}>
              <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
              Resume
            </button>
          )}
          {['registration', 'live', 'paused'].includes(game.status) && (
            <button type="button" className={styles.ghostDarkButton} onClick={() => changeStatus('ended')} disabled={!!busy}>
              End game
            </button>
          )}
          <a
            className={`${styles.ghostDarkButton} ${styles.recapButton}`}
            href={`/api/bingo/admin/games/${game.id}/recap.csv`}
            title="Download a privacy-safe event recap"
          >
            <span className="material-symbols-outlined" aria-hidden="true">ios_share</span>
            Share recap
          </a>
          <a
            className={styles.ghostDarkButton}
            href={`/api/bingo/admin/games/${game.id}/export.csv`}
            title="Download the private participant report"
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            Participant CSV
          </a>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.signalRow}>
        <div>
          <span>Registered</span>
          <strong>{stats.registered}</strong>
          <small>{stats.active} active</small>
        </div>
        <div>
          <span>Connections</span>
          <strong>{stats.connections}</strong>
          <small>{stats.completed_prompts} prompts cleared</small>
        </div>
        <div>
          <span>Finishers</span>
          <strong>{stats.finishers}</strong>
          <small>Game continues</small>
        </div>
        <div>
          <span>Average progress</span>
          <strong>{stats.average_completed}</strong>
          <small>of {game.prompt_count} prompts</small>
        </div>
      </div>

      {finishers.length > 0 && (
        <section className={styles.winnerStage} aria-labelledby="winner-stage-title">
          <div className={styles.winnerStageCopy}>
            <span>Winner&apos;s circle</span>
            <h2 id="winner-stage-title">
              {podium.length === 3
                ? 'Congratulations to the top three.'
                : 'The podium is taking shape.'}
            </h2>
            <p>
              Each place is assigned by the server at the moment a card is completed.
              The shareable recap includes these results without participant emails.
            </p>
          </div>
          <div className={styles.winnerStageGrid}>
            {[1, 2, 3].map((place) => {
              const player = podium.find((person) => person.finish_place === place);
              return (
                <article className={!player ? styles.podiumOpen : ''} data-place={place} key={place}>
                  <span>0{place}</span>
                  {player ? (
                    <>
                      <div>
                        <strong>{player.display_name}</strong>
                        <small>{player.company || 'BERG attendee'}</small>
                      </div>
                      <time title={new Date(player.completed_at).toLocaleString()}>
                        {formatTime(player.completed_at)}
                      </time>
                    </>
                  ) : (
                    <div>
                      <strong>Place open</strong>
                      <small>Waiting for a finisher</small>
                    </div>
                  )}
                  <i aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className={styles.liveGrid}>
        <section className={styles.leaderboardPanel}>
          <div className={styles.liveSectionHeader}>
            <div><span>01</span><h2>Top 10 finishing order</h2></div>
            <small>Showing {topTenFinishers.length} of {finishers.length}</small>
          </div>
          {finishers.length === 0 ? (
            <p className={styles.panelEmpty}>No one has crossed the finish line yet.</p>
          ) : (
            <ol className={styles.finisherList}>
              {topTenFinishers.map((player) => (
                <li key={player.id}>
                  <span className={styles.placeNumber}>{player.finish_place}</span>
                  <div><strong>{player.display_name}</strong><small>{player.company || player.email}</small></div>
                  <time>{formatTime(player.completed_at)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={styles.connectorPanel}>
          <div className={styles.liveSectionHeader}>
            <div><span>02</span><h2>Connection leaders</h2></div>
          </div>
          <ol className={styles.connectorList}>
            {connectors.map((player, index) => (
              <li key={player.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{player.display_name}</strong><small>{player.company || 'BERG attendee'}</small></div>
                <b>{player.completed_count}<small>connections</small></b>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={styles.liveTableCard}>
        <div className={styles.liveSectionHeader}>
          <div><span>03</span><h2>Players</h2></div>
          <small>{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : ''}</small>
        </div>
        <div className={styles.tableTools}>
          <input
            type="search"
            value={playerQuery}
            onChange={(event) => {
              setPlayerQuery(event.target.value);
              setPlayerPage(0);
            }}
            placeholder="Search name, email, or company"
            aria-label="Search players"
            spellCheck={false}
          />
          <span>
            {filteredPlayers.length === players.length
              ? `${players.length} players`
              : `${filteredPlayers.length} of ${players.length} players`}
          </span>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Player</th><th>Progress</th><th>Place</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => (
                <tr key={player.id}>
                  <td><strong>{player.display_name}</strong><small>{player.email}<br />{player.company}</small></td>
                  <td>
                    <div className={styles.miniProgress}>
                      <i style={{ width: `${Math.min(100, (player.completed_count / game.prompt_count) * 100)}%` }} />
                    </div>
                    <span>{player.completed_count}/{game.prompt_count}</span>
                  </td>
                  <td>{player.finish_place ? `#${player.finish_place}` : '—'}</td>
                  <td><span className={`${styles.playerStatus} ${styles[`player_${player.status}`]}`}>{player.status}</span></td>
                  <td>
                    <button
                      type="button"
                      className={styles.tableAction}
                      disabled={busy === player.id}
                      onClick={() => setPlayerStatus(player.id, player.status === 'active' ? 'suspended' : 'active')}
                    >
                      {player.status === 'active' ? 'Suspend' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className={styles.tablePager}>
            <button
              type="button"
              onClick={() => setPlayerPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
            >
              Previous
            </button>
            <span>Page {safePage + 1} of {pageCount}</span>
            <button
              type="button"
              onClick={() => setPlayerPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <section className={styles.liveTableCard}>
        <div className={styles.liveSectionHeader}>
          <div><span>04</span><h2>Connection activity</h2></div>
          <small>Newest first</small>
        </div>
        {recentConnections.length === 0 ? (
          <p className={styles.panelEmpty}>Connections will appear here as the room starts moving.</p>
        ) : (
          <div className={styles.activityList}>
            {recentConnections.map((connection) => (
              <div key={connection.id}>
                <time>{formatTime(connection.created_at)}</time>
                <p>
                  <strong>{connection.scanner_name}</strong> met <strong>{connection.target_name}</strong>
                  <span>{connection.prompt_text}</span>
                </p>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    disabled={busy === connection.id}
                    onClick={() => revokeConnection(connection.id)}
                    aria-label="Revoke connection"
                    title="Revoke connection"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">undo</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
