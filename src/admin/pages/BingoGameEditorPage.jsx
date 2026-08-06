import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './BingoAdmin.module.css';

const NEXT_ACTIONS = {
  draft: [{ status: 'registration', label: 'Open registration', icon: 'how_to_reg' }],
  registration: [
    { status: 'live', label: 'Start game', icon: 'play_arrow' },
    { status: 'draft', label: 'Return to draft', icon: 'edit' },
    { status: 'ended', label: 'End game', icon: 'stop_circle' },
  ],
  live: [
    { status: 'paused', label: 'Pause game', icon: 'pause' },
    { status: 'ended', label: 'End game', icon: 'stop_circle' },
  ],
  paused: [
    { status: 'live', label: 'Resume game', icon: 'play_arrow' },
    { status: 'ended', label: 'End game', icon: 'stop_circle' },
  ],
  ended: [{ status: 'archived', label: 'Archive', icon: 'archive' }],
  archived: [],
};

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function BingoGameEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(12);
  const [generateContext, setGenerateContext] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState('');
  const [promptBusy, setPromptBusy] = useState(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load game');
      setGame(data.game);
      setPrompts(data.prompts || []);
      setAiEnabled(!!data.ai_prompts_enabled);
      setForm({
        title: data.game.title || '',
        join_code: data.game.join_code || '',
        instructions: data.game.instructions || '',
        prompt_count: data.game.prompt_count || 12,
        leaderboard_public: !!data.game.leaderboard_public,
        contact_sharing_enabled: !!data.game.contact_sharing_enabled,
        theme: data.game.settings?.theme || 'berghaus',
        starts_at: toLocalDateTime(data.game.starts_at),
        ends_at: toLocalDateTime(data.game.ends_at),
      });
      const qr = await QRCode.toDataURL(data.game.public_url, {
        width: 720,
        margin: 3,
        color: { dark: '#10271E', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(qr);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    load();
  }, [load]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice('');
  }

  async function saveGame(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          prompt_count: Number(form.prompt_count),
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save game');
      setGame((current) => ({ ...current, ...data.game }));
      setNotice('Game settings saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status) {
    setStatusBusy(status);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update game status');
      setGame((current) => ({ ...current, ...data.game }));
      setNotice(`Game is now ${status === 'registration' ? 'open for registration' : status}.`);
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setStatusBusy('');
    }
  }

  function updatePromptLocal(promptId, field, value) {
    setPrompts((current) => current.map((prompt) => (
      prompt.id === promptId ? { ...prompt, [field]: value } : prompt
    )));
  }

  async function savePrompt(prompt) {
    setPromptBusy(prompt.id);
    setError('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/prompts/${prompt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          prompt_text: prompt.prompt_text,
          helper_text: prompt.helper_text,
          category: prompt.category,
          sort_order: Number(prompt.sort_order),
          is_active: !!prompt.is_active,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save prompt');
      setPrompts((current) => current.map((item) => (
        item.id === prompt.id ? data.prompt : item
      )));
      setNotice('Prompt saved.');
    } catch (promptError) {
      setError(promptError.message);
    } finally {
      setPromptBusy(null);
    }
  }

  // Candidates are held in local state until the admin picks them — nothing
  // reaches the database (or players) without an explicit choice.
  async function generatePrompts() {
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/prompts/generate`, {
        method: 'POST',
        body: JSON.stringify({ count: generateCount, context: generateContext }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not generate prompts');
      setCandidates(data.prompts.map((prompt, index) => ({ ...prompt, key: `${Date.now()}-${index}` })));
      setSelectedCandidates(new Set(data.prompts.map((unused, index) => `${Date.now()}-${index}`)));
      setNotice(`${data.prompts.length} suggestions ready. Review and keep the ones you want.`);
    } catch (generateError) {
      setError(generateError.message);
    } finally {
      setGenerating(false);
    }
  }

  async function keepSelectedCandidates() {
    const chosen = candidates.filter((candidate) => selectedCandidates.has(candidate.key));
    if (!chosen.length) return;
    setPromptBusy('candidates');
    setError('');
    try {
      // Sequential so sort_order stays in the order the admin sees.
      const added = [];
      for (const candidate of chosen) {
        const response = await apiFetch(`/api/bingo/admin/games/${id}/prompts`, {
          method: 'POST',
          body: JSON.stringify({
            prompt_text: candidate.prompt_text,
            category: candidate.category,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not add prompt');
        added.push(data.prompt);
      }
      setPrompts((current) => [...current, ...added]);
      setCandidates([]);
      setSelectedCandidates(new Set());
      setNotice(`Added ${added.length} prompt${added.length === 1 ? '' : 's'}.`);
    } catch (keepError) {
      setError(keepError.message);
    } finally {
      setPromptBusy(null);
    }
  }

  function toggleCandidate(key) {
    setSelectedCandidates((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function addPrompt(event) {
    event.preventDefault();
    if (!newPrompt.trim()) return;
    setPromptBusy('new');
    setError('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/prompts`, {
        method: 'POST',
        body: JSON.stringify({ prompt_text: newPrompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not add prompt');
      setPrompts((current) => [...current, data.prompt]);
      setNewPrompt('');
      setNotice('Prompt added.');
    } catch (promptError) {
      setError(promptError.message);
    } finally {
      setPromptBusy(null);
    }
  }

  async function deletePrompt(promptId) {
    setPromptBusy(promptId);
    setError('');
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}/prompts/${promptId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete prompt');
      setPrompts((current) => current.filter((prompt) => prompt.id !== promptId));
      setNotice('Prompt removed.');
    } catch (promptError) {
      setError(promptError.message);
    } finally {
      setPromptBusy(null);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(game.public_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function deleteGame() {
    if (!window.confirm('Delete this empty draft game? This cannot be undone.')) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/bingo/admin/games/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete game');
      navigate('/admin/bingo');
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingCard}>Preparing the game room…</div>;
  if (!game || !form) return <div className={styles.errorBanner}>{error || 'Game not found'}</div>;

  const activePromptCount = prompts.filter((prompt) => prompt.is_active).length;
  const promptLocked = game.status !== 'draft';

  return (
    <div className={`${styles.page} ${styles.editorPage}`}>
      <header className={styles.pageHeader}>
        <div>
          <Link to="/admin/bingo" className={styles.backLink}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            All games
          </Link>
          <span className={styles.eyebrow}>{game.event_title}</span>
          <h1 className={styles.pageTitle}>{game.title}</h1>
          <div className={styles.headerMeta}>
            <span className={`${styles.statusPill} ${styles[`status_${game.status}`]}`}>
              {game.status}
            </span>
            <span>Code <strong>{game.join_code}</strong></span>
            <span>{game.player_count} players</span>
          </div>
        </div>
        <div className={styles.headerButtons}>
          {game.status !== 'draft' && (
            <Link className={styles.secondaryButton} to={`/admin/bingo/${game.id}/live`}>
              <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>
              Live dashboard
            </Link>
          )}
          <a
            className={styles.primaryButton}
            href={game.public_url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
            Preview
          </a>
        </div>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {notice && <div className={styles.noticeBanner}>{notice}</div>}

      <section className={styles.controlStrip}>
        <div>
          <span className={styles.darkEyebrow}>Game state</span>
          <strong>{game.status === 'draft' ? 'Build mode' : game.status}</strong>
          <p>
            {game.status === 'draft'
              ? 'Finish your prompts, then open registration.'
              : game.status === 'registration'
                ? 'Players can register. Start when the room is ready.'
                : game.status === 'live'
                  ? 'Connections and placements are being recorded.'
                  : game.status === 'paused'
                    ? 'Players can view the game, but scans are paused.'
                    : 'The game is closed to new connections.'}
          </p>
        </div>
        <div className={styles.statusActions}>
          {(NEXT_ACTIONS[game.status] || []).map((action) => (
            <button
              key={action.status}
              type="button"
              className={action.status === 'live' || action.status === 'registration'
                ? styles.goldButton
                : styles.darkButton}
              disabled={!!statusBusy}
              onClick={() => changeStatus(action.status)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{action.icon}</span>
              {statusBusy === action.status ? 'Updating…' : action.label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.editorGrid}>
        <div className={styles.editorMain}>
          <form className={styles.adminCard} onSubmit={saveGame}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.cardNumber}>01</span>
                <div>
                  <h2>Game details</h2>
                  <p>The information attendees see before they enter the room.</p>
                </div>
              </div>
            </div>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Game title</span>
                <input
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Join code</span>
                <input
                  value={form.join_code}
                  onChange={(event) => updateForm('join_code', event.target.value.toUpperCase())}
                  disabled={game.status !== 'draft'}
                />
              </label>
              <label className={styles.field}>
                <span>Prompts per player</span>
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={form.prompt_count}
                  onChange={(event) => updateForm('prompt_count', event.target.value)}
                  disabled={game.status !== 'draft'}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Welcome instructions</span>
                <textarea
                  rows="4"
                  value={form.instructions}
                  onChange={(event) => updateForm('instructions', event.target.value)}
                  placeholder="Meet someone new, have a real conversation, then scan their code to keep moving."
                />
              </label>
              <label className={styles.field}>
                <span>Registration starts</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => updateForm('starts_at', event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Game ends</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => updateForm('ends_at', event.target.value)}
                />
              </label>
            </div>
            <div className={styles.toggleRows}>
              <label>
                <input
                  type="checkbox"
                  checked={form.leaderboard_public}
                  onChange={(event) => updateForm('leaderboard_public', event.target.checked)}
                />
                <span><strong>Player leaderboard</strong><small>Signed-in players can see live rankings.</small></span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.contact_sharing_enabled}
                  onChange={(event) => updateForm('contact_sharing_enabled', event.target.checked)}
                />
                <span><strong>Opt-in contact sharing</strong><small>Players choose whether to share email, LinkedIn, or Instagram.</small></span>
              </label>
            </div>
            <div className={styles.themePicker}>
              <span className={styles.themePickerLabel}>Event theme</span>
              <p className={styles.themePickerHelp}>
                Applies to the player experience only. The admin area and all QR
                codes are unaffected.
              </p>
              {[
                {
                  value: 'berghaus',
                  label: 'BERGHAUS (default)',
                  swatches: ['#173d2d', '#d8aa3c', '#f3eee3', '#ad5538'],
                },
                {
                  value: 'midnight-rooftop',
                  label: 'Midnight Rooftop',
                  swatches: ['#04112B', '#08DDF2', '#FF2C98', '#FFAD3D'],
                },
              ].map((option) => (
                <label key={option.value} className={styles.themeOption}>
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={(form.theme || 'berghaus') === option.value}
                    onChange={() => updateForm('theme', option.value)}
                  />
                  <span>{option.label}</span>
                  <span className={styles.themeSwatches} aria-hidden="true">
                    {option.swatches.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                </label>
              ))}
            </div>
            <div className={styles.cardFooter}>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <span className="material-symbols-outlined" aria-hidden="true">save</span>
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>

          <section className={styles.adminCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.cardNumber}>02</span>
                <div>
                  <h2>Conversation prompts</h2>
                  <p>
                    {activePromptCount} active · {form.prompt_count} assigned to each player
                  </p>
                </div>
              </div>
              <span className={activePromptCount >= Number(form.prompt_count)
                ? styles.readyBadge
                : styles.warningBadge}
              >
                {activePromptCount >= Number(form.prompt_count)
                  ? 'Ready'
                  : `${Number(form.prompt_count) - activePromptCount} more needed`}
              </span>
            </div>

            {promptLocked && (
              <div className={styles.lockedNote}>
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                Prompts are frozen because registration has opened. Players keep the prompt order they received.
              </div>
            )}

            <div className={styles.promptList}>
              {prompts.map((prompt, index) => (
                <div className={`${styles.promptRow} ${!prompt.is_active ? styles.promptInactive : ''}`} key={prompt.id}>
                  <label className={styles.orderField}>
                    <span>Order</span>
                    <input
                      type="number"
                      min="1"
                      value={prompt.sort_order || index + 1}
                      onChange={(event) => updatePromptLocal(prompt.id, 'sort_order', event.target.value)}
                      disabled={promptLocked}
                    />
                  </label>
                  <label className={styles.promptField}>
                    <span>Prompt {index + 1}</span>
                    <textarea
                      rows="2"
                      value={prompt.prompt_text}
                      onChange={(event) => updatePromptLocal(prompt.id, 'prompt_text', event.target.value)}
                      disabled={promptLocked}
                    />
                  </label>
                  <div className={styles.promptControls}>
                    <label className={styles.activeCheck}>
                      <input
                        type="checkbox"
                        checked={!!prompt.is_active}
                        onChange={(event) => updatePromptLocal(prompt.id, 'is_active', event.target.checked)}
                        disabled={promptLocked}
                      />
                      Active
                    </label>
                    {!promptLocked && (
                      <>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => savePrompt(prompt)}
                          disabled={promptBusy === prompt.id}
                          aria-label={`Save prompt ${index + 1}`}
                          title="Save prompt"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">save</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconButton} ${styles.dangerIcon}`}
                          onClick={() => deletePrompt(prompt.id)}
                          disabled={promptBusy === prompt.id}
                          aria-label={`Delete prompt ${index + 1}`}
                          title="Delete prompt"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!promptLocked && aiEnabled && (
              <section className={styles.aiPanel}>
                <div className={styles.aiPanelHead}>
                  <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                  <div>
                    <strong>Draft prompts with Claude</strong>
                    <small>
                      Written in BERG&rsquo;s voice from past event prompts. Nothing is added
                      until you choose it. Usually about 10 seconds — the first run
                      each day takes a couple of minutes while the format compiles.
                    </small>
                  </div>
                </div>

                <label className={styles.aiField}>
                  <span>What should these prompts know about the event? <em>optional</em></span>
                  <textarea
                    value={generateContext}
                    onChange={(event) => setGenerateContext(event.target.value)}
                    placeholder="e.g. Summer rooftop mixer, mostly founders and creatives, first BERG event for a lot of the room."
                    maxLength="1200"
                    rows="3"
                  />
                </label>

                <div className={styles.aiActions}>
                  <label>
                    <span>How many</span>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={generateCount}
                      onChange={(event) => setGenerateCount(Number(event.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={generatePrompts}
                    disabled={generating}
                  >
                    {generating ? 'Writing…' : candidates.length ? 'Generate more' : 'Generate suggestions'}
                  </button>
                </div>

                {candidates.length > 0 && (
                  <div className={styles.candidateList}>
                    <div className={styles.candidateHead}>
                      <span>{selectedCandidates.size} of {candidates.length} selected</span>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidates(new Set(candidates.map((c) => c.key)))}
                        >
                          Select all
                        </button>
                        <button type="button" onClick={() => setSelectedCandidates(new Set())}>
                          Clear
                        </button>
                      </div>
                    </div>

                    {candidates.map((candidate) => (
                      <label key={candidate.key} className={styles.candidate}>
                        <input
                          type="checkbox"
                          checked={selectedCandidates.has(candidate.key)}
                          onChange={() => toggleCandidate(candidate.key)}
                        />
                        <span>
                          {candidate.prompt_text}
                          <i>{candidate.category}</i>
                        </span>
                      </label>
                    ))}

                    <div className={styles.candidateFooter}>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={keepSelectedCandidates}
                        disabled={promptBusy === 'candidates' || selectedCandidates.size === 0}
                      >
                        {promptBusy === 'candidates'
                          ? 'Adding…'
                          : `Add ${selectedCandidates.size} prompt${selectedCandidates.size === 1 ? '' : 's'}`}
                      </button>
                      <button type="button" className={styles.ghostButton} onClick={() => setCandidates([])}>
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {!promptLocked && (
              <form className={styles.addPrompt} onSubmit={addPrompt}>
                <div>
                  <span className="material-symbols-outlined" aria-hidden="true">add_comment</span>
                  <input
                    value={newPrompt}
                    onChange={(event) => setNewPrompt(event.target.value)}
                    placeholder="Add a custom conversation prompt…"
                    maxLength="500"
                  />
                </div>
                <button type="submit" className={styles.secondaryButton} disabled={promptBusy === 'new'}>
                  {promptBusy === 'new' ? 'Adding…' : 'Add prompt'}
                </button>
              </form>
            )}
          </section>
        </div>

        <aside className={styles.editorAside}>
          <section className={styles.launchCard}>
            <span className={styles.darkEyebrow}>Launch kit</span>
            <h2>Put this room in motion.</h2>
            <p>Display the main code at the entrance, on screen, or in your event materials.</p>
            <div className={styles.qrFrame}>
              {qrDataUrl && <img src={qrDataUrl} alt={`QR code for ${game.title}`} />}
            </div>
            <div className={styles.bigCode}>{game.join_code}</div>
            <div className={styles.publicUrl}>{game.public_url}</div>
            <div className={styles.launchActions}>
              <button type="button" onClick={copyLink}>
                <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a href={qrDataUrl} download={`berg-bingo-${game.join_code}.png`}>
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                QR PNG
              </a>
            </div>
          </section>

          <section className={styles.rulesCard}>
            <span className={styles.darkEyebrow}>Built-in rules</span>
            <ul>
              <li><span>01</span>One new person per prompt</li>
              <li><span>02</span>No self-scans or repeated partners</li>
              <li><span>03</span>Server-assigned finishing places</li>
              <li><span>04</span>The game continues after first place</li>
            </ul>
          </section>

          {game.status === 'draft' && user?.role === 'admin' && (
            <button type="button" className={styles.deleteButton} onClick={deleteGame} disabled={saving}>
              <span className="material-symbols-outlined" aria-hidden="true">delete</span>
              Delete draft game
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
