import { useEffect, useRef, useState } from 'react';
import styles from './AiSummitSurveyPage.module.css';

/* ──────────────────────────────────────────────────────────────
   Amplified Intelligence — Post-event pulse survey
   Attendee-only link (unlisted, noindex). Responses stored in
   form_submissions (form_type = 'aisummit_survey'); results are
   reviewed in the admin at /admin/surveys/aisummit.
   ────────────────────────────────────────────────────────────── */

const SITE_URL = 'https://bergcollective.org';
const PAGE_PATH = '/aisummit/survey';

// Keys must match SURVEY_SESSIONS in server/routes/forms.js
const SESSIONS = [
  { key: 'thrive_knicks', title: 'How to Thrive like "Knicks in Five": Future-Proof Your Career in the Age of AI' },
  { key: 'death_of_app', title: 'The Death of the App and the Rise of Agents' },
  { key: 'ai_on_the_go', title: 'AI on the Go: Building Full-Featured Applications from Your Mobile Device' },
  { key: 'ai_native_company', title: 'Building an AI-Native Company: Reimagining How We Work' },
  { key: 'partnership_brain', title: 'From Campaigns to Systems: Build an AI Partnership Brain in 10 Minutes' },
  { key: 'differentiation', title: 'The Art of Differentiation: Standing Out in a Sea of Sameness' },
  { key: 'speed_of_thought', title: 'Speed of Thought: The Future of Entrepreneurship' },
];

/* ── Inline brand mark: "Ai" monogram with the signature gradient ── */
function Monogram({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Amplified Intelligence" focusable="false">
      <defs>
        <linearGradient id="aiGradSurvey" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C8FF" />
          <stop offset="1" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <path d="M7 52 L24 13 L41 52" fill="none" stroke="url(#aiGradSurvey)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 40 H33" fill="none" stroke="url(#aiGradSurvey)" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="52" cy="18.5" r="4.3" fill="url(#aiGradSurvey)" />
      <rect x="48" y="28" width="8" height="24" rx="4" fill="url(#aiGradSurvey)" />
    </svg>
  );
}

/* ── Per-route head: title, description, noindex (attendee-only link) ── */
function useSurveyHead() {
  useEffect(() => {
    const title = 'Pulse Survey — BERG AI Summit 2026';
    const description =
      'Thanks for joining us at Amplified Intelligence. Take 2 minutes to help us shape the next AI Summit.';
    const url = `${SITE_URL}${PAGE_PATH}`;

    const created = [];
    const prevTitle = document.title;

    function meta(attr, key, content) {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      let mine = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        mine = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', content);
      created.push({ el, mine, prev });
    }
    function link(rel, href) {
      let el = document.head.querySelector(`link[rel="${rel}"]`);
      let mine = false;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
        mine = true;
      }
      const prev = el.getAttribute('href');
      el.setAttribute('href', href);
      created.push({ el, mine, prev });
    }

    document.title = title;
    meta('name', 'description', description);
    meta('name', 'robots', 'noindex, nofollow');
    link('canonical', url);
    link('icon', '/images/aisummit/ai-monogram.svg');

    return () => {
      document.title = prevTitle;
      created.forEach(({ el, mine, prev }) => {
        if (mine) {
          el.remove();
        } else if (prev !== null) {
          el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', prev);
        }
      });
    };
  }, []);
}

/* ── Reusable numeric scale (tap-to-select, tap again to clear if optional) ── */
function Scale({ value, onChange, min, max, lowLabel, highLabel, optional = false, name }) {
  const nums = [];
  for (let n = min; n <= max; n++) nums.push(n);
  return (
    <div className={styles.scaleWrap}>
      <div className={styles.scale} role="radiogroup" aria-label={name}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={`${styles.scaleBtn}${value === n ? ` ${styles.scaleBtnActive}` : ''}`}
            onClick={() => onChange(optional && value === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={styles.scaleLabels}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export default function AiSummitSurveyPage() {
  useSurveyHead();

  const [form, setForm] = useState({ fullName: '', email: '' });
  const [overall, setOverall] = useState(null);
  const [nps, setNps] = useState(null);
  const [sessionRatings, setSessionRatings] = useState({});
  const [text, setText] = useState({ most_valuable: '', general_feedback: '', next_summit: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [message, setMessage] = useState('');
  const honeypotRef = useRef(null);

  // Deep-space body background (restore on unmount) to kill overscroll flashes.
  useEffect(() => {
    const body = document.body;
    const prevBg = body.style.background;
    const prevScheme = body.style.colorScheme;
    body.style.background = '#060B14';
    body.style.colorScheme = 'dark';
    return () => {
      body.style.background = prevBg;
      body.style.colorScheme = prevScheme;
    };
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateText = (key) => (e) => setText((t) => ({ ...t, [key]: e.target.value }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSubmit =
    form.fullName.trim() && emailOk && overall !== null && nps !== null && status !== 'submitting';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setStatus('error');
      setMessage('Please fill in your name and email, and answer the two required rating questions.');
      return;
    }
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/forms/aisummit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName.trim(),
          email: form.email.trim(),
          rating_overall: overall,
          nps,
          session_ratings: sessionRatings,
          most_valuable: text.most_valuable,
          general_feedback: text.general_feedback,
          next_summit: text.next_summit,
          company_url: honeypotRef.current?.value || '', // honeypot
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(result.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      setMessage(result.message || 'Thank you for your feedback!');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        {/* ── Brand header ── */}
        <header className={styles.brandRow}>
          <a className={styles.brand} href="/aisummit" aria-label="Back to the BERG AI Summit">
            <Monogram size={30} />
            <span className={styles.brandText}>Amplified Intelligence</span>
          </a>
          <span className={styles.brandTag}>BERG AI Summit 2026</span>
        </header>

        <div className={styles.glow} aria-hidden="true" />

        {status === 'success' ? (
          /* ── Success state ── */
          <section className={styles.card}>
            <span className={styles.checkBadge} aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#060B14" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h1 className={styles.successTitle}>Thank you!</h1>
            <p className={styles.successBody}>{message}</p>
            <p className={styles.successSub}>
              Your feedback goes straight to the team planning the next <strong>BERG AI Summit</strong>.
            </p>
            <a className={`${styles.btn} ${styles.btnGhost}`} href="/aisummit">
              Back to the Summit
            </a>
          </section>
        ) : (
          <>
            {/* ── Hero ── */}
            <section className={styles.hero}>
              <p className={styles.eyebrow}>Pulse Survey</p>
              <h1 className={styles.headline}>
                How was <span className={styles.grad}>Amplified Intelligence</span>?
              </h1>
              <p className={styles.lede}>
                Thanks for joining us on <strong>June 27 at Squarespace HQ</strong>! We hope you found the
                programming valuable and engaging. Please complete this 2-minute survey to help us shape the
                next AI Summit.
              </p>
            </section>

            {/* ── Form ── */}
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {/* Honeypot — hidden from users, catches bots */}
              <input
                ref={honeypotRef}
                type="text"
                name="company_url"
                tabIndex={-1}
                autoComplete="off"
                className={styles.honeypot}
                aria-hidden="true"
              />

              {/* About you */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>About you</h2>
                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Full name <span className={styles.req}>*</span></span>
                    <input
                      className={styles.input}
                      type="text"
                      name="name"
                      value={form.fullName}
                      onChange={update('fullName')}
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Email address <span className={styles.req}>*</span></span>
                    <input
                      className={styles.input}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>
              </section>

              {/* Overall rating */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>
                  Overall, how would you rate the AI Summit? <span className={styles.req}>*</span>
                </h2>
                <Scale
                  name="Overall rating"
                  value={overall}
                  onChange={setOverall}
                  min={1}
                  max={5}
                  lowLabel="Poor"
                  highLabel="Excellent"
                />
              </section>

              {/* Session ratings */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Rate the sessions you attended</h2>
                <p className={styles.cardHint}>Skip any you missed.</p>
                <div className={styles.sessions}>
                  {SESSIONS.map((s) => (
                    <div key={s.key} className={styles.session}>
                      <p className={styles.sessionTitle}>{s.title}</p>
                      <Scale
                        name={s.title}
                        value={sessionRatings[s.key] ?? null}
                        onChange={(v) => setSessionRatings((r) => ({ ...r, [s.key]: v }))}
                        min={1}
                        max={5}
                        lowLabel="Poor"
                        highLabel="Excellent"
                        optional
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Open feedback */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Tell us more</h2>
                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span className={styles.label}>What did you find most valuable about the programming?</span>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={text.most_valuable}
                      onChange={updateText('most_valuable')}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Do you have general feedback about the summit?</span>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={text.general_feedback}
                      onChange={updateText('general_feedback')}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>What should we change or add for the next summit?</span>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={text.next_summit}
                      onChange={updateText('next_summit')}
                    />
                  </label>
                </div>
              </section>

              {/* NPS */}
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>
                  How likely are you to recommend the next BERG AI Summit to a friend or colleague?{' '}
                  <span className={styles.req}>*</span>
                </h2>
                <Scale
                  name="Likelihood to recommend"
                  value={nps}
                  onChange={setNps}
                  min={0}
                  max={10}
                  lowLabel="Not likely"
                  highLabel="Extremely likely"
                />
              </section>

              {status === 'error' && (
                <p className={styles.error} role="alert">{message}</p>
              )}

              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!canSubmit}>
                {status === 'submitting' ? 'Submitting…' : 'Submit survey'}
                {status !== 'submitting' && <span aria-hidden="true"> →</span>}
              </button>

              <p className={styles.privacy}>
                We only use your responses to improve future BERG events.
              </p>
            </form>
          </>
        )}

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <span>Presented by BERG Collective</span>
        </footer>
      </main>
    </div>
  );
}
