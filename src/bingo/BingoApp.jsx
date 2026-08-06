import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import QRCode from 'qrcode';
import styles from './Bingo.module.css';

const STATUS_COPY = {
  draft: {
    label: 'Not open yet',
    title: 'The room is still being prepared.',
    body: 'The host is finishing the prompts. Check back soon.',
  },
  registration: {
    label: 'Registration open',
    title: 'Your next connection is in this room.',
    body: 'Verify your email, build your player card, and you will be ready when the host starts.',
  },
  live: {
    label: 'Live now',
    title: 'The room is moving.',
    body: 'Join the game, meet someone new, and turn a conversation into a connection.',
  },
  paused: {
    label: 'Temporarily paused',
    title: 'Hold that thought.',
    body: 'The host paused new connections. You can still sign in and see your progress.',
  },
  ended: {
    label: 'Game complete',
    title: 'This room made connections.',
    body: 'The game has ended. Signed-in players can still revisit the people they met.',
  },
};

const WALKTHROUGH_STEPS = [
  {
    number: '01',
    label: 'Meet',
    title: 'Start with the prompt on your card.',
    body: 'Find someone new and use the prompt to begin a real conversation. It is a starting point—not a script you have to follow.',
    note: 'Talk first. The scan comes after.',
    image: '/images/bingo/onboarding/01-prompt.webp',
    imageAlt: 'The Bingo play screen showing a conversation prompt and the scan button.',
  },
  {
    number: '02',
    label: 'Confirm',
    title: 'Scan the other person’s player pass.',
    body: 'After you talk, tap “Scan their code.” They open My pass and show you their QR. If the camera cannot scan it, enter their short player code.',
    note: 'Each person can complete one prompt on your card.',
    image: '/images/bingo/onboarding/02-player-pass.webp',
    imageAlt: 'The My pass screen showing a participant’s personal event QR code.',
  },
  {
    number: '03',
    label: 'Keep going',
    title: 'Save the connection and unlock what is next.',
    body: 'The person is added to Connections and your next prompt appears. Shared details are shown only when that person opted in.',
    note: 'The room keeps moving after the first person finishes.',
    image: '/images/bingo/onboarding/03-connections.webp',
    imageAlt: 'The Connections screen showing people met during the game.',
  },
];

function walkthroughStorageKey(gameId) {
  return `berg-bingo-walkthrough:${gameId}`;
}

function hasSeenWalkthrough(gameId) {
  try {
    return window.localStorage.getItem(walkthroughStorageKey(gameId)) === 'complete';
  } catch {
    return false;
  }
}

function markWalkthroughSeen(gameId) {
  try {
    window.localStorage.setItem(walkthroughStorageKey(gameId), 'complete');
  } catch {
    // The walkthrough still works when storage is unavailable.
  }
}

function BingoIcon({ name }) {
  const commonProps = {
    className: styles.uiIcon,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'scan') {
    return (
      <svg {...commonProps}>
        <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </svg>
    );
  }
  if (name === 'qr') {
    return (
      <svg {...commonProps}>
        <rect x="3.5" y="3.5" width="6" height="6" />
        <rect x="14.5" y="3.5" width="6" height="6" />
        <rect x="3.5" y="14.5" width="6" height="6" />
        <path d="M14.5 14.5h2v2h-2zM18.5 14.5h2v6h-6v-2" />
      </svg>
    );
  }
  if (name === 'leaders') {
    return (
      <svg {...commonProps}>
        <path d="M4 20V11h4v9M10 20V5h4v15M16 20v-7h4v7M3 20h18" />
      </svg>
    );
  }
  if (name === 'connections') {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15.5c.8-.7 1.8-1 3-1 2.5 0 3.8 1.7 4 4.5" />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <path d="M20 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A8 8 0 1 1 20 15Z" />
    </svg>
  );
}

async function bingoFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function useBingoMeta(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | BERG Networking Bingo` : 'BERG Networking Bingo';
    let robots = document.head.querySelector('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const previousContent = robots.content;
    robots.content = 'noindex, nofollow';
    return () => {
      document.title = previousTitle;
      if (created) robots.remove();
      else robots.content = previousContent;
    };
  }, [title]);
}

function BingoShell({ children, gameCode, minimal = false }) {
  return (
    <div className={styles.shell}>
      <div className={styles.ambient} aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <header className={styles.shellHeader}>
        <Link to="/bingo" className={styles.brand} aria-label="BERG Networking Bingo home">
          <img src="/images/logo-black.png" alt="BERG Collective" />
          <span><b>Networking</b><em>Bingo</em></span>
        </Link>
        {gameCode ? (
          <div className={styles.headerCode}>
            <span>Room code</span>
            <strong>{gameCode}</strong>
          </div>
        ) : (
          <div className={styles.headerSignal}>
            <i />
            Built for real rooms
          </div>
        )}
      </header>
      <main className={minimal ? styles.minimalMain : styles.shellMain}>{children}</main>
      <footer className={styles.shellFooter}>
        <span>BERG Collective</span>
        <p>Meet with intention. Share only what you choose.</p>
        <a href="https://bergcollective.org" target="_blank" rel="noreferrer">bergcollective.org</a>
      </footer>
    </div>
  );
}

function BingoLandingPage() {
  useBingoMeta();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function enterRoom(event) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (normalized) navigate(`/bingo/${normalized}`);
  }

  return (
    <BingoShell>
      <section className={styles.landingHero}>
        <div className={styles.landingCopy}>
          <span className={styles.kicker}>A better reason to say hello</span>
          <h1>
            The room is full of people
            <em> worth meeting.</em>
          </h1>
          <p>
            Networking Bingo turns a prompt into an introduction—and an introduction
            into a connection you can keep.
          </p>
          <form className={styles.codeForm} onSubmit={enterRoom}>
            <label htmlFor="bingo-code">Enter your event code</label>
            <div>
              <input
                id="bingo-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength="24"
              />
              <button type="submit">
                Enter room
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
          <p className={styles.scanHint}>
            At an event? Scan the official BERG room QR and you will land in the right place.
          </p>
        </div>
        <div className={styles.connectionPoster} aria-hidden="true">
          <div className={styles.posterTop}>
            <span>BERG / 01</span>
            <b>Make the first move.</b>
          </div>
          <div className={styles.posterPrompt}>
            <span>Your prompt</span>
            <p>Find someone building something that did not exist a year ago.</p>
          </div>
          <div className={styles.posterNetwork}>
            <i /><i /><i /><i /><i /><i />
            <svg viewBox="0 0 360 180" role="presentation">
              <path d="M38 124 L112 50 L187 110 L260 42 L324 126" />
              <path d="M38 124 L187 110 L324 126" />
              <path d="M112 50 L260 42" />
            </svg>
          </div>
          <div className={styles.posterFoot}>
            <strong>1 conversation</strong>
            <span>can change the shape of your network</span>
          </div>
        </div>
      </section>

      <section className={styles.howItMoves}>
        <div className={styles.sectionIntro}>
          <span className={styles.kicker}>How the room moves</span>
          <h2>Simple enough to start in seconds.</h2>
        </div>
        <ol>
          <li><span>01</span><strong>Join</strong><p>Scan the room code and verify your email. No app or password.</p></li>
          <li><span>02</span><strong>Meet</strong><p>Use your prompt as a reason to start a real conversation.</p></li>
          <li><span>03</span><strong>Connect</strong><p>Scan each other’s personal codes to unlock the next prompt.</p></li>
          <li><span>04</span><strong>Keep</strong><p>Revisit everyone you met and the details they chose to share.</p></li>
        </ol>
      </section>
    </BingoShell>
  );
}

function MagicAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const fallbackCode = searchParams.get('game') || '';
  const pendingPerson = searchParams.get('person') || '';
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');

  useBingoMeta(link?.title || 'Secure sign-in');

  useEffect(() => {
    let active = true;
    async function inspect() {
      try {
        const response = await bingoFetch(`/api/bingo/auth/inspect?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'This link is no longer valid');
        if (active) setLink(data.link);
      } catch (inspectError) {
        if (active) setError(inspectError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (token) inspect();
    else {
      setError('This sign-in link is incomplete.');
      setLoading(false);
    }
    return () => { active = false; };
  }, [token]);

  async function redeem() {
    setRedeeming(true);
    setError('');
    try {
      const response = await bingoFetch('/api/bingo/auth/redeem', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not complete sign-in');
      const personQuery = pendingPerson
        ? `?person=${encodeURIComponent(pendingPerson)}`
        : '';
      navigate(`/bingo/${data.gameCode}${personQuery}`, { replace: true });
    } catch (redeemError) {
      setError(redeemError.message);
      setRedeeming(false);
    }
  }

  return (
    <BingoShell gameCode={link?.join_code || fallbackCode} minimal>
      <section className={styles.authCard}>
        <div className={styles.authSeal} aria-hidden="true">
          <span>✓</span>
        </div>
        <span className={styles.kicker}>Secure room entry</span>
        {loading ? (
          <>
            <h1>Checking your invitation…</h1>
            <div className={styles.loadingLine}><i /></div>
          </>
        ) : error ? (
          <>
            <h1>This link cannot open the room.</h1>
            <p>{error}</p>
            <Link className={styles.textButton} to={fallbackCode ? `/bingo/${fallbackCode}` : '/bingo'}>
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <h1>You are one tap from the room.</h1>
            <p>
              Continue to <strong>{link.title}</strong>. This explicit step keeps automated
              email scanners from using your one-time sign-in link.
            </p>
            <button className={styles.mainButton} type="button" onClick={redeem} disabled={redeeming}>
              {redeeming ? 'Opening room…' : 'Verify & continue'}
              <span aria-hidden="true">↗</span>
            </button>
          </>
        )}
      </section>
    </BingoShell>
  );
}

function StatusPanel({ game }) {
  const copy = STATUS_COPY[game.status] || STATUS_COPY.draft;
  return (
    <div className={`${styles.statusPanel} ${styles[`status_${game.status}`]}`}>
      <span>{copy.label}</span>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
    </div>
  );
}

function HowToPlayWalkthrough({
  open,
  gameTitle,
  onClose,
  onComplete,
  completeLabel = 'Start playing',
}) {
  const [activeStep, setActiveStep] = useState(0);
  const walkthroughRef = useRef(null);
  const closeButtonRef = useRef(null);
  const handleClose = useCallback(() => {
    setActiveStep(0);
    onClose();
  }, [onClose]);
  const handleComplete = useCallback(() => {
    setActiveStep(0);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
      if (event.key === 'Tab') {
        const focusable = [...(walkthroughRef.current?.querySelectorAll('button:not([disabled])') || [])];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === 'ArrowRight') {
        setActiveStep((current) => Math.min(WALKTHROUGH_STEPS.length - 1, current + 1));
      }
      if (event.key === 'ArrowLeft') {
        setActiveStep((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleClose, open]);

  if (!open) return null;

  const step = WALKTHROUGH_STEPS[activeStep];
  const isLast = activeStep === WALKTHROUGH_STEPS.length - 1;

  return (
    <div className={styles.walkthroughBackdrop} role="presentation" onMouseDown={handleClose}>
      <section
        ref={walkthroughRef}
        className={styles.walkthrough}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.walkthroughHeader}>
          <div>
            <span>How to play</span>
            <strong>{gameTitle || 'BERG Networking Bingo'}</strong>
          </div>
          <button ref={closeButtonRef} type="button" onClick={handleClose} aria-label="Close how to play">
            ×
          </button>
        </header>

        <div className={styles.walkthroughBody}>
          <div className={styles.walkthroughVisual}>
            <div className={styles.phoneFrame}>
              <img src={step.image} alt={step.imageAlt} />
            </div>
            <span>Actual game screen</span>
          </div>

          <div className={styles.walkthroughCopy}>
            <div className={styles.walkthroughStepLabel}>
              <span>{step.number}</span>
              <strong>{step.label}</strong>
            </div>
            <h2 id="walkthrough-title">{step.title}</h2>
            <p>{step.body}</p>
            <div className={styles.walkthroughNote}>
              <span aria-hidden="true">✓</span>
              <p>{step.note}</p>
            </div>
          </div>
        </div>

        <footer className={styles.walkthroughFooter}>
          <div className={styles.walkthroughProgress} aria-label={`Step ${activeStep + 1} of ${WALKTHROUGH_STEPS.length}`}>
            {WALKTHROUGH_STEPS.map((item, index) => (
              <button
                key={item.number}
                type="button"
                className={index === activeStep ? styles.walkthroughProgressActive : ''}
                onClick={() => setActiveStep(index)}
                aria-label={`Go to step ${index + 1}: ${item.label}`}
                aria-current={index === activeStep ? 'step' : undefined}
              >
                <i />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.walkthroughActions}>
            {activeStep > 0 ? (
              <button
                type="button"
                className={styles.walkthroughBack}
                onClick={() => setActiveStep((current) => current - 1)}
              >
                Back
              </button>
            ) : (
              <button type="button" className={styles.walkthroughBack} onClick={handleComplete}>
                Skip
              </button>
            )}
            <button
              type="button"
              className={styles.walkthroughNext}
              onClick={() => {
                if (isLast) handleComplete();
                else setActiveStep((current) => current + 1);
              }}
            >
              {isLast ? completeLabel : 'Next'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function GameGatewayPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingPerson = searchParams.get('person') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [joining, setJoining] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    company: '',
    job_title: '',
    linkedin_url: '',
    share_email: false,
    share_linkedin: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not find this game');
      setData(result);
      setProfile((current) => ({ ...current, ...(result.profile || {}) }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useBingoMeta(data?.game?.title || 'Join a game');

  async function requestLink(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}/magic-link`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          person_token: pendingPerson,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send your link');
      setLinkSent(true);
      setDevLink(result.dev_magic_link || '');
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  async function joinGame(event) {
    event.preventDefault();
    setJoining(true);
    setError('');
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        body: JSON.stringify(profile),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not create your player card');
      const personQuery = pendingPerson
        ? `?person=${encodeURIComponent(pendingPerson)}`
        : '';
      navigate(`/bingo/${result.game.join_code}/play${personQuery}`, { replace: true });
    } catch (joinError) {
      setError(joinError.message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <BingoShell gameCode={code} minimal>
        <div className={styles.roomLoading}><i /><span>Finding your room…</span></div>
      </BingoShell>
    );
  }

  if (error && !data) {
    return (
      <BingoShell gameCode={code} minimal>
        <section className={styles.authCard}>
          <span className={styles.kicker}>Room unavailable</span>
          <h1>We could not find that game.</h1>
          <p>{error}</p>
          <Link className={styles.textButton} to="/bingo">Try another room code</Link>
        </section>
      </BingoShell>
    );
  }

  if (data.joined) {
    const personQuery = pendingPerson
      ? `?person=${encodeURIComponent(pendingPerson)}`
      : '';
    return <Navigate to={`/bingo/${data.game.join_code}/play${personQuery}`} replace />;
  }

  const { game } = data;
  const canRegister = ['registration', 'live', 'paused'].includes(game.status);

  return (
    <BingoShell gameCode={game.join_code}>
      <section className={styles.gateway}>
        <div className={styles.roomIdentity}>
          <div className={styles.roomContext}>
            <span className={styles.kicker}>{game.event.title}</span>
            <span className={`${styles.roomStatusBadge} ${styles[`status_${game.status}`]}`}>
              <i />{STATUS_COPY[game.status]?.label || game.status}
            </span>
          </div>
          <h1>{game.title}</h1>
          <div className={styles.eventLine}>
            {game.event.date && <span>{new Date(`${String(game.event.date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>}
            {game.event.time && <span>{game.event.time}</span>}
            {game.event.location && <span>{game.event.location}</span>}
          </div>
          <StatusPanel game={game} />
          <div className={styles.roomRules}>
            <div><span>01</span><p>One prompt. One new person.</p></div>
            <div><span>02</span><p>Scan their code to confirm the connection.</p></div>
            <div><span>03</span><p>Keep moving—even after the first finisher.</p></div>
          </div>
          <button
            type="button"
            className={styles.walkthroughLink}
            onClick={() => setWalkthroughOpen(true)}
          >
            <span aria-hidden="true">▶</span>
            See the 30-second walkthrough
          </button>
        </div>

        <div className={styles.entryPanel}>
          {!canRegister ? (
            <div className={styles.closedCard}>
              <span className={styles.entryStep}>Room status</span>
              <h2>{game.status === 'ended' ? 'The game has ended.' : 'Registration is not open yet.'}</h2>
              <p>{game.status === 'ended' ? 'Already played? Sign-in access will remain available from your existing session.' : 'Keep this link and check back when the host opens the room.'}</p>
            </div>
          ) : !data.authenticated ? (
            <div className={styles.signInCard}>
              <div className={styles.entryProgress} aria-label="Step 1 of 2">
                <i className={styles.entryProgressActive} />
                <i />
              </div>
              <span className={styles.entryStep}>01 / Verify your email</span>
              {linkSent ? (
                <>
                  <div className={styles.mailMark} aria-hidden="true">✦</div>
                  <h2>Check your inbox.</h2>
                  <p>
                    We sent a private sign-in link to <strong>{email}</strong>.
                    Open it on this phone to continue.
                  </p>
                  {devLink && <a className={styles.devLink} href={devLink}>Development: open magic link</a>}
                  <button type="button" className={styles.textButton} onClick={() => setLinkSent(false)}>
                    Use a different email
                  </button>
                </>
              ) : (
                <>
                  <h2>Join the room.</h2>
                  <p>We will send a private, 10-minute sign-in link. No password to remember.</p>
                  <form onSubmit={requestLink}>
                    <label htmlFor="player-email">Email address</label>
                    <input
                      id="player-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                    />
                    <button type="submit" className={styles.mainButton} disabled={sending}>
                      {sending ? 'Sending secure link…' : 'Email my magic link'}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </form>
                  <div className={styles.trustLine}>
                    <span aria-hidden="true">✓</span>
                    <small>Used only for this game. Separate from event RSVP and marketing.</small>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.profileCard}>
              <div className={styles.entryProgress} aria-label="Step 2 of 2">
                <i className={styles.entryProgressDone} />
                <i className={styles.entryProgressActive} />
              </div>
              <span className={styles.entryStep}>02 / Build your player card</span>
              <h2>Introduce yourself.</h2>
              <p>Your name appears in the room. Everything else is optional and controlled by you.</p>
              <form onSubmit={joinGame}>
                <label>
                  <span>Display name *</span>
                  <input
                    value={profile.display_name}
                    onChange={(event) => setProfile((current) => ({ ...current, display_name: event.target.value }))}
                    placeholder="First and last name"
                    maxLength="80"
                    required
                  />
                </label>
                <div className={styles.profileGrid}>
                  <label>
                    <span>Company</span>
                    <input
                      value={profile.company}
                      onChange={(event) => setProfile((current) => ({ ...current, company: event.target.value }))}
                      placeholder="Organization"
                      maxLength="120"
                    />
                  </label>
                  <label>
                    <span>Role</span>
                    <input
                      value={profile.job_title}
                      onChange={(event) => setProfile((current) => ({ ...current, job_title: event.target.value }))}
                      placeholder="What you do"
                      maxLength="120"
                    />
                  </label>
                </div>
                {game.contact_sharing_enabled && (
                  <>
                    <label>
                      <span>LinkedIn <em>optional</em></span>
                      <input
                        value={profile.linkedin_url}
                        onChange={(event) => setProfile((current) => ({ ...current, linkedin_url: event.target.value }))}
                        placeholder="linkedin.com/in/you"
                        maxLength="300"
                      />
                    </label>
                    <div className={styles.shareChoices}>
                      <span>Share after connecting</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={profile.share_linkedin}
                          onChange={(event) => setProfile((current) => ({ ...current, share_linkedin: event.target.checked }))}
                        />
                        LinkedIn
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={profile.share_email}
                          onChange={(event) => setProfile((current) => ({ ...current, share_email: event.target.checked }))}
                        />
                        Email
                      </label>
                    </div>
                  </>
                )}
                <button type="submit" className={styles.mainButton} disabled={joining}>
                  {joining ? 'Creating your card…' : 'Enter the room'}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </div>
          )}
          {error && <div className={styles.inlineError}>{error}</div>}
        </div>
      </section>
      <HowToPlayWalkthrough
        open={walkthroughOpen}
        gameTitle={game.title}
        onClose={() => setWalkthroughOpen(false)}
        onComplete={() => {
          markWalkthroughSeen(game.id);
          setWalkthroughOpen(false);
        }}
        completeLabel="Back to sign up"
      />
    </BingoShell>
  );
}

function ScannerModal({ gameCode, onToken, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let controls;
    let cancelled = false;

    async function startScanner() {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled) return;
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!result || cancelled) return;
          try {
            const url = new URL(result.getText(), window.location.origin);
            const token = url.searchParams.get('person');
            const pathParts = url.pathname.split('/').filter(Boolean);
            const scannedCode = pathParts[1]?.toUpperCase();
            if (!token || scannedCode !== gameCode.toUpperCase()) {
              setError('That is not a player code for this room.');
              return;
            }
            controls?.stop();
            onToken(token);
          } catch {
            setError('That QR code is not a BERG player code.');
          }
        });
      } catch (scannerError) {
        if (!cancelled) {
          setError(
            scannerError?.name === 'NotAllowedError'
              ? 'Camera access was blocked. Allow camera access or enter the player code instead.'
              : 'The camera could not start. Enter the player code instead.'
          );
        }
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [gameCode, onToken]);

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.scannerModal} role="dialog" aria-modal="true" aria-labelledby="scanner-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div><span>Camera scanner</span><h2 id="scanner-title">Frame their player QR</h2></div>
          <button type="button" onClick={onClose} aria-label="Close scanner">×</button>
        </div>
        <div className={styles.videoFrame}>
          <video ref={videoRef} muted playsInline />
          <div className={styles.scanCorners}><i /><i /><i /><i /></div>
          <span>Hold steady</span>
        </div>
        {error && <p className={styles.scannerError}>{error}</p>}
        <p className={styles.scannerHelp}>Only scan after you have had the conversation shown on your prompt.</p>
      </section>
    </div>
  );
}

function ConnectionConfirmModal({ prompt, personToken, connectionCode, onConfirm, onClose, busy }) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className={styles.kicker}>Confirm connection</span>
        <h2 id="confirm-title">Did you have this conversation?</h2>
        <blockquote>{prompt?.prompt_text}</blockquote>
        <p>Recording it completes this prompt and unlocks the next one. Each person can appear once on your card.</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.textButton} onClick={onClose}>Not yet</button>
          <button
            type="button"
            className={styles.mainButton}
            disabled={busy}
            onClick={() => onConfirm({ person_token: personToken, connection_code: connectionCode })}
          >
            {busy ? 'Recording…' : 'Yes, record connection'}
          </button>
        </div>
      </section>
    </div>
  );
}

function PersonalQrPanel({ state }) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const playerUrl = `${window.location.origin}/bingo/${state.game.join_code}/connect?person=${encodeURIComponent(state.player.qr_token)}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(playerUrl, {
      width: 780,
      margin: 3,
      errorCorrectionLevel: 'H',
      color: { dark: '#10271E', light: '#FFFFFF' },
    }).then((value) => {
      if (active) setQr(value);
    });
    return () => { active = false; };
  }, [playerUrl]);

  async function shareCode() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${state.player.display_name}'s BERG Bingo code`,
          text: `Connect with me in ${state.game.title}`,
          url: playerUrl,
        });
        return;
      } catch {
        // A cancelled share falls through to copy for a predictable fallback.
      }
    }
    await navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className={styles.personalPanel}>
      <span className={styles.viewKicker}>Your player pass</span>
      <h2>Ready to connect.</h2>
      <p>Show this after the conversation. The code identifies you inside this event and contains no contact details.</p>
      <div className={styles.personalQr}>
        <div className={styles.qrTicketMeta}>
          <span>BERG Networking</span>
          <strong>{state.game.join_code}</strong>
        </div>
        {qr && <img src={qr} alt={`Personal QR code for ${state.player.display_name}`} />}
        <div className={styles.qrName}>
          <div>
            <strong>{state.player.display_name}</strong>
            <span>{state.player.job_title || 'BERG attendee'}</span>
          </div>
          <b>{state.player.company || 'Guest'}</b>
        </div>
        <div className={styles.qrTicketFoot}>
          <span>Identity-only pass</span>
          <span>Scan once per player</span>
        </div>
      </div>
      <div className={styles.fallbackCode}>
        <span>Camera not cooperating?</span>
        <strong>{state.player.connection_code}</strong>
        <small>Have them enter this code manually.</small>
      </div>
      <button type="button" className={styles.outlineButton} onClick={shareCode}>
        {copied ? 'Player link copied' : 'Share or copy my code'}
        <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}

function LeaderboardPanel({ leaderboard, playerId }) {
  const finishers = leaderboard?.finishers || [];
  const connectors = leaderboard?.connectors || [];
  const podium = finishers.filter((person) => person.finish_place <= 3);
  const remainingFinishers = finishers.filter((person) => person.finish_place > 3);

  function finishedTime(value) {
    if (!value) return 'Time pending';
    return `Finished ${new Date(value).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return (
    <section className={styles.leaderboardView}>
      <span className={styles.viewKicker}>Live room</span>
      <h2>The room&apos;s top ten.</h2>
      <p>
        {podium.length === 3
          ? 'Congratulations to our first three finishers. The game keeps going—every new conversation still matters.'
          : 'The podium is taking shape. Finish your card to claim a place among the room’s first three.'}
      </p>

      {finishers.length === 0 ? (
        <div className={`${styles.boardSection} ${styles.podiumBoard}`}>
          <div className={styles.boardTitle}><span>Top three</span><small>Full prompt card</small></div>
          <div className={styles.boardEmpty}>The first finish is still up for grabs.</div>
        </div>
      ) : (
        <>
          <div className={styles.podiumBoard}>
            <div className={styles.podiumHeading}>
              <span>First across the line</span>
              <small>
                {podium.length === 3
                  ? 'Podium complete'
                  : `${3 - podium.length} place${3 - podium.length === 1 ? '' : 's'} open`}
              </small>
            </div>
            <div className={styles.podiumGrid}>
              {podium.map((person) => (
                <article
                  className={person.id === playerId ? styles.podiumYou : ''}
                  data-place={person.finish_place}
                  key={person.id}
                >
                  <span className={styles.podiumPlace}>0{person.finish_place}</span>
                  <div>
                    <strong>{person.display_name}{person.id === playerId ? ' · You' : ''}</strong>
                    <small>{person.company || 'BERG attendee'}</small>
                  </div>
                  <time>{finishedTime(person.completed_at)}</time>
                  <i aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>

          {remainingFinishers.length > 0 && (
            <div className={styles.boardSection}>
              <div className={styles.boardTitle}><span>Top ten</span><small>Places 4–10</small></div>
              <ol>
                {remainingFinishers.map((person) => (
                  <li className={person.id === playerId ? styles.youRow : ''} key={person.id}>
                    <b>{person.finish_place}</b>
                    <div>
                      <strong>{person.display_name}{person.id === playerId ? ' · You' : ''}</strong>
                      <small>{person.company || 'BERG attendee'}</small>
                    </div>
                    <time className={styles.boardTime}>{finishedTime(person.completed_at)}</time>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
      <div className={styles.boardSection}>
        <div className={styles.boardTitle}><span>Connection leaders</span><small>Top ten</small></div>
        {connectors.length === 0 ? (
          <div className={styles.boardEmpty}>The room is just getting started.</div>
        ) : (
          <ol>
            {connectors.map((person, index) => (
              <li className={person.id === playerId ? styles.youRow : ''} key={person.id}>
                <b>{index + 1}</b>
                <div><strong>{person.display_name}{person.id === playerId ? ' · You' : ''}</strong><small>{person.company || 'BERG attendee'}</small></div>
                <span>{person.completed_count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function ConnectionsPanel({ connections }) {
  return (
    <section className={styles.connectionsView}>
      <span className={styles.viewKicker}>Your network</span>
      <h2>{connections.length ? `${connections.length} people, remembered.` : 'The next hello starts here.'}</h2>
      <p>Contact details appear only when the person chose to share them.</p>
      {connections.length === 0 ? (
        <div className={styles.connectionEmpty}>
          <div aria-hidden="true"><i /><i /><i /></div>
          <strong>No connections recorded yet.</strong>
          <span>Complete your first prompt and they will appear here.</span>
        </div>
      ) : (
        <div className={styles.connectionCards}>
          {connections.map((connection, index) => (
            <article key={connection.id}>
              <div className={styles.connectionIndex}>{String(index + 1).padStart(2, '0')}</div>
              <div className={styles.connectionIdentity}>
                <strong>{connection.display_name}</strong>
                <span>{[connection.job_title, connection.company].filter(Boolean).join(' · ') || 'BERG attendee'}</span>
                <blockquote>{connection.prompt_text}</blockquote>
              </div>
              <div className={styles.contactLinks}>
                {connection.linkedin_url && <a href={connection.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
                {connection.email && <a href={`mailto:${connection.email}`}>Email ↗</a>}
                {!connection.linkedin_url && !connection.email && <span>Details kept private</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GamePlayPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('play');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}/leaderboard`);
      if (response.ok) setLeaderboard(await response.json());
    } catch {
      // Leaderboard is supplementary; keep the game usable if it cannot refresh.
    }
  }, [code]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}/player`);
      const result = await response.json().catch(() => ({}));
      if (response.status === 401 || (response.ok && !result.player)) {
        const personQuery = searchParams.get('person')
          ? `?person=${encodeURIComponent(searchParams.get('person'))}`
          : '';
        navigate(`/bingo/${code}${personQuery}`, { replace: true });
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load your card');
      setState(result);
      setError('');
      if (result.game.status === 'ended' && !result.current_prompt) setTab('connections');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [code, navigate, searchParams]);

  useEffect(() => {
    load();
    loadLeaderboard();
  }, [load, loadLeaderboard]);

  useEffect(() => {
    if (!state || !['registration', 'live', 'paused'].includes(state.game.status)) return undefined;
    const interval = window.setInterval(() => {
      load({ quiet: true });
      if (tab === 'leaders') loadLeaderboard();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [load, loadLeaderboard, state, tab]);

  useEffect(() => {
    const incoming = searchParams.get('person');
    if (!incoming || !state?.player) return;
    setPendingToken(incoming);
    setPendingCode('');
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, state]);

  useEffect(() => {
    if (!state?.game?.id || hasSeenWalkthrough(state.game.id)) return;
    setWalkthroughOpen(true);
  }, [state?.game?.id]);

  useBingoMeta(state?.game?.title || 'Your game');

  const handleScannedToken = useCallback((token) => {
    setScannerOpen(false);
    setPendingToken(token);
    setPendingCode('');
  }, []);

  async function completeConnection(payload) {
    setConnectBusy(true);
    setError('');
    try {
      const response = await bingoFetch(`/api/bingo/games/${encodeURIComponent(code)}/connect`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not record connection');
      setState(result);
      setSuccess(result.completed_connection);
      setPendingToken('');
      setPendingCode('');
      setManualCode('');
      setManualOpen(false);
      await loadLeaderboard();
      window.setTimeout(() => setSuccess(null), 5000);
    } catch (connectionError) {
      setError(connectionError.message);
      setPendingToken('');
      setPendingCode('');
    } finally {
      setConnectBusy(false);
    }
  }

  function submitManual(event) {
    event.preventDefault();
    const normalized = manualCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalized) return;
    setPendingCode(normalized);
    setPendingToken('');
    setManualOpen(false);
  }

  if (loading) {
    return (
      <BingoShell gameCode={code} minimal>
        <div className={styles.roomLoading}><i /><span>Shuffling your prompts…</span></div>
      </BingoShell>
    );
  }

  if (!state) {
    return (
      <BingoShell gameCode={code} minimal>
        <section className={styles.authCard}>
          <h1>Your card could not load.</h1>
          <p>{error}</p>
          <button type="button" className={styles.mainButton} onClick={() => load()}>Try again</button>
        </section>
      </BingoShell>
    );
  }

  const { game, player, prompts, current_prompt: currentPrompt, connections } = state;
  const progress = Math.min(100, (player.completed_count / game.prompt_count) * 100);
  const showConfirm = !!(pendingToken || pendingCode);

  return (
    <div className={styles.gameShell}>
      <header className={styles.gameHeader}>
        <Link to="/bingo" className={styles.gameBrand}>
          <img src="/images/logo-black.png" alt="BERG Collective" />
          <span>Bingo</span>
        </Link>
        <div className={styles.gameHeaderRoom}>
          <span>{game.title}</span>
          <strong>{game.join_code}</strong>
        </div>
        <div className={styles.gameHeaderActions}>
          <button
            type="button"
            className={styles.helpButton}
            onClick={() => setWalkthroughOpen(true)}
            aria-label="Open how to play"
          >
            <span aria-hidden="true">?</span>
            <small>How to play</small>
          </button>
          <button type="button" className={styles.avatarButton} onClick={() => setTab('qr')} aria-label="Show my player QR">
            {player.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </button>
        </div>
      </header>

      <div className={styles.progressRail}>
        <i style={{ width: `${progress}%` }} />
      </div>

      <main className={styles.gameMain}>
        {tab === 'play' && (
          <section className={styles.playView}>
            <div className={styles.playTopline}>
              <div>
                <span className={`${styles.gameStatus} ${styles[`status_${game.status}`]}`}>
                  <i />{STATUS_COPY[game.status]?.label || game.status}
                </span>
                <h1>Hello, {player.display_name.split(' ')[0]}.</h1>
              </div>
              <div className={styles.progressCount}>
                <strong>{player.completed_count}</strong>
                <span>of {game.prompt_count}</span>
              </div>
            </div>

            {player.finish_place ? (
              <div className={`${styles.finishCard} ${player.finish_place <= 3 ? styles.winnerFinishCard : ''}`}>
                <span>{player.finish_place <= 3 ? 'Congratulations' : 'You finished'}</span>
                <strong>{player.finish_label}</strong>
                <h2>{player.finish_place <= 3 ? 'You made the podium.' : 'Your card is complete.'}</h2>
                <p>
                  {player.finish_place <= 3
                    ? 'You are one of the room’s first three finishers. Keep sharing your player code and celebrate the people you met.'
                    : 'You can keep sharing your player code and revisit the people you met.'}
                </p>
                <button type="button" className={styles.mainButton} onClick={() => setTab('connections')}>
                  See my connections
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            ) : game.status === 'registration' ? (
              <div className={styles.waitingCard}>
                <div className={styles.waitingOrbit}><i /><i /><i /></div>
                <span>Player card ready</span>
                <h2>The host will start the room soon.</h2>
                <p>Keep this page open. Your first prompt will be ready the moment the game goes live.</p>
                <button type="button" className={styles.outlineButton} onClick={() => setTab('qr')}>Preview my player QR</button>
              </div>
            ) : game.status === 'paused' ? (
              <div className={styles.waitingCard}>
                <div className={styles.pauseMark}>Ⅱ</div>
                <span>Game paused</span>
                <h2>Hold your next scan.</h2>
                <p>The host paused new connections. Your progress is safe.</p>
              </div>
            ) : game.status === 'ended' ? (
              <div className={styles.waitingCard}>
                <div className={styles.pauseMark}>✓</div>
                <span>Game ended</span>
                <h2>{player.completed_count} connections made.</h2>
                <p>Your network from this room is saved below.</p>
                <button type="button" className={styles.mainButton} onClick={() => setTab('connections')}>See my connections</button>
              </div>
            ) : currentPrompt ? (
              <>
                <article className={styles.promptCard}>
                  <div className={styles.promptCardHead}>
                    <span>Current prompt</span>
                    <i>
                      {String(player.completed_count + 1).padStart(2, '0')}
                      <small> / {String(game.prompt_count).padStart(2, '0')}</small>
                    </i>
                  </div>
                  <blockquote>{currentPrompt.prompt_text}</blockquote>
                  {currentPrompt.helper_text && <p>{currentPrompt.helper_text}</p>}
                  <div className={styles.promptFooter}>
                    <span>Meet first.</span>
                    <span>Scan second.</span>
                  </div>
                </article>
                <div className={styles.scanActions}>
                  <button type="button" className={styles.scanButton} onClick={() => setScannerOpen(true)}>
                    <BingoIcon name="scan" />
                    Scan their code
                    <i aria-hidden="true">↗</i>
                  </button>
                  <button type="button" className={styles.manualButton} onClick={() => setManualOpen(true)}>
                    Enter player code
                  </button>
                </div>
                <p className={styles.scanPrivacy}>The scan records the connection—not your conversation.</p>
              </>
            ) : null}

            {error && <div className={styles.gameError}>{error}</div>}

            <div className={styles.completedTrail}>
              <div className={styles.trailTitle}><span>Card progress</span><small>{player.completed_count}/{game.prompt_count} complete</small></div>
              <div className={styles.trailDots}>
                {prompts.map((prompt) => (
                  <i
                    key={prompt.id}
                    className={prompt.completed_at ? styles.dotComplete : prompt.id === currentPrompt?.id ? styles.dotCurrent : ''}
                    title={prompt.completed_at ? `Completed with ${prompt.completed_with_name}` : `Prompt ${prompt.position}`}
                  >
                    {prompt.completed_at ? '✓' : prompt.position}
                  </i>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'qr' && <PersonalQrPanel state={state} />}
        {tab === 'leaders' && <LeaderboardPanel leaderboard={leaderboard} playerId={player.id} />}
        {tab === 'connections' && <ConnectionsPanel connections={connections} />}
      </main>

      <nav className={styles.gameNav} aria-label="Game navigation">
        {[
          ['play', 'play', 'Play'],
          ['qr', 'qr', 'My pass'],
          ...(game.leaderboard_public ? [['leaders', 'leaders', 'Leaders']] : []),
          ['connections', 'connections', 'Connections'],
        ].map(([value, icon, label]) => (
          <button
            type="button"
            key={value}
            className={tab === value ? styles.navActive : ''}
            onClick={() => {
              setTab(value);
              if (value === 'leaders') loadLeaderboard();
            }}
          >
            <BingoIcon name={icon} />
            <small>{label}</small>
            {value === 'connections' && connections.length > 0 && <i>{connections.length}</i>}
          </button>
        ))}
      </nav>

      <HowToPlayWalkthrough
        open={walkthroughOpen}
        gameTitle={game.title}
        onClose={() => setWalkthroughOpen(false)}
        onComplete={() => {
          markWalkthroughSeen(game.id);
          setWalkthroughOpen(false);
        }}
      />

      {scannerOpen && (
        <ScannerModal gameCode={game.join_code} onToken={handleScannedToken} onClose={() => setScannerOpen(false)} />
      )}

      {manualOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setManualOpen(false)}>
          <section className={styles.manualModal} role="dialog" aria-modal="true" aria-labelledby="manual-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div><span>Code fallback</span><h2 id="manual-title">Enter their player code</h2></div>
              <button type="button" onClick={() => setManualOpen(false)} aria-label="Close">×</button>
            </div>
            <p>Ask the person for the eight-character code below their QR.</p>
            <form onSubmit={submitManual}>
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                placeholder="PLAYER CODE"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                maxLength="12"
              />
              <button type="submit" className={styles.mainButton}>Continue</button>
            </form>
          </section>
        </div>
      )}

      {showConfirm && (
        <ConnectionConfirmModal
          prompt={currentPrompt}
          personToken={pendingToken}
          connectionCode={pendingCode}
          busy={connectBusy}
          onConfirm={completeConnection}
          onClose={() => {
            setPendingToken('');
            setPendingCode('');
          }}
        />
      )}

      {success && (
        <div className={styles.successToast} role="status">
          <div className={styles.successBurst} aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <span>Connection recorded</span>
          <strong>You met {success.person}.</strong>
          {success.finish_place
            ? (
                <p>
                  {success.finish_place <= 3 ? 'Congratulations—' : ''}
                  You finished in place #{success.finish_place}.
                </p>
              )
            : <p>Your next prompt is ready.</p>}
          <button type="button" onClick={() => setSuccess(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

export default function BingoApp() {
  return (
    <Routes>
      <Route index element={<BingoLandingPage />} />
      <Route path="auth" element={<MagicAuthPage />} />
      <Route path=":code" element={<GameGatewayPage />} />
      <Route path=":code/play" element={<GamePlayPage />} />
      <Route path=":code/connect" element={<GamePlayPage />} />
      <Route path="*" element={<Navigate to="/bingo" replace />} />
    </Routes>
  );
}
