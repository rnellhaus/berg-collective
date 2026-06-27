import { useEffect, useRef, useState } from 'react';
import styles from './AiSummitOpenAIPage.module.css';

/* ──────────────────────────────────────────────────────────────
   Amplified Intelligence × OpenAI — ChatGPT Plus credit claim
   Standalone deep-space page (co-branded with OpenAI). Goal: collect
   Full Name + email from attendees, stored in form_submissions
   (form_type = 'aisummit_openai') to be shared with OpenAI.
   ────────────────────────────────────────────────────────────── */

const SITE_URL = 'https://bergcollective.org';
const PAGE_PATH = '/aisummit/openai';
const OG_IMAGE = `${SITE_URL}/images/aisummit/og-amplified-intelligence.jpg`;
const OPENAI_SIGNUP_URL = 'https://chatgpt.com/';

/* ── Inline brand mark: "Ai" monogram with the signature gradient ── */
function Monogram({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Amplified Intelligence" focusable="false">
      <defs>
        <linearGradient id="aiGradOpenai" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00C8FF" />
          <stop offset="1" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <path d="M7 52 L24 13 L41 52" fill="none" stroke="url(#aiGradOpenai)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 40 H33" fill="none" stroke="url(#aiGradOpenai)" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="52" cy="18.5" r="4.3" fill="url(#aiGradOpenai)" />
      <rect x="48" y="28" width="8" height="24" rx="4" fill="url(#aiGradOpenai)" />
    </svg>
  );
}

/* ── Per-route head: title, meta, OG, favicon, deep-space body bg ── */
function useOpenAIHead() {
  useEffect(() => {
    const title = 'Claim 3 Months of ChatGPT Plus — BERG AI Summit 2026';
    const description =
      'AI Summit attendees: OpenAI is giving you 3 months of ChatGPT Plus, free. Submit your name and email to claim your credit.';
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
    link('canonical', url);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', 'BERG Collective');
    meta('property', 'og:title', title);
    meta('property', 'og:description', description);
    meta('property', 'og:url', url);
    meta('property', 'og:image', OG_IMAGE);
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', description);
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

export default function AiSummitOpenAIPage() {
  useOpenAIHead();

  const [form, setForm] = useState({ fullName: '', email: '', hasAccount: false, consent: false });
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

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSubmit = form.fullName.trim() && emailOk && form.hasAccount && form.consent && status !== 'submitting';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setStatus('error');
      setMessage('Please complete every field and check both boxes.');
      return;
    }
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/forms/aisummit-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName.trim(),
          email: form.email.trim(),
          has_account: form.hasAccount,
          consent: form.consent,
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
      setMessage(result.message || "You're all set!");
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        {/* ── Co-brand header ── */}
        <header className={styles.brandRow}>
          <a className={styles.brand} href="/aisummit" aria-label="Back to the BERG AI Summit">
            <Monogram size={30} />
            <span className={styles.brandText}>Amplified Intelligence</span>
          </a>
          <span className={styles.cobrand}>
            <span className={styles.cobrandLabel}>in partnership with</span>
            <img
              className={styles.openaiLogo}
              src="/images/aisummit/sponsors/openai.webp"
              width="104"
              height="26"
              alt="OpenAI"
            />
          </span>
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
            <h1 className={styles.successTitle}>You're all set.</h1>
            <p className={styles.successBody}>{message}</p>
            <p className={styles.successSub}>
              Keep an eye on your inbox — OpenAI will apply <strong>3 months of ChatGPT Plus</strong> to the account
              tied to the email you submitted.
            </p>
            <a className={`${styles.btn} ${styles.btnGhost}`} href="/aisummit">
              Back to the Summit
            </a>
          </section>
        ) : (
          <>
            {/* ── Hero / offer ── */}
            <section className={styles.hero}>
              <p className={styles.eyebrow}>A Special Offer</p>
              <h1 className={styles.headline}>
                Claim <span className={styles.grad}>3 months</span> of ChatGPT Plus — free.
              </h1>
              <p className={styles.lede}>
                As a thank-you to every <strong>Amplified Intelligence</strong> attendee, OpenAI is giving you three
                months of ChatGPT Plus, completely free. Submit your email below to claim it.
              </p>
              <p className={styles.deadline}>
                <svg className={styles.deadlineIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Deadline to apply: <strong>Tuesday, June 30</strong>
              </p>
            </section>

            {/* ── How to claim ── */}
            <section className={styles.steps} aria-label="How to claim">
              <article className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <h2 className={styles.stepTitle}>Create an OpenAI account</h2>
                  <p className={styles.stepBody}>
                    Use your personal email. Already have an account? Skip ahead to step 2.
                  </p>
                  <a className={styles.stepLink} href={OPENAI_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
                    Create an account <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
              <article className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <h2 className={styles.stepTitle}>Submit your email</h2>
                  <p className={styles.stepBody}>
                    Enter the email tied to your OpenAI account so the credit lands on the right one.
                  </p>
                </div>
              </article>
            </section>

            {/* ── Form ── */}
            <section className={styles.card} id="claim">
              <h2 className={styles.cardTitle}>Claim your credit</h2>
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

                <label className={styles.field}>
                  <span className={styles.label}>Full name</span>
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
                  <span className={styles.label}>Email</span>
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
                  <span className={styles.hint}>Use the email tied to your OpenAI account.</span>
                </label>

                <label className={styles.check}>
                  <input type="checkbox" checked={form.hasAccount} onChange={update('hasAccount')} required />
                  <span>I have an OpenAI account using this email address.</span>
                </label>

                <label className={styles.check}>
                  <input type="checkbox" checked={form.consent} onChange={update('consent')} required />
                  <span>
                    I agree to share my email with OpenAI to receive 3 months of ChatGPT Plus.
                  </span>
                </label>

                {status === 'error' && (
                  <p className={styles.error} role="alert">{message}</p>
                )}

                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!canSubmit}>
                  {status === 'submitting' ? 'Submitting…' : 'Claim my 3 months'}
                  {status !== 'submitting' && <span aria-hidden="true"> →</span>}
                </button>

                <p className={styles.privacy}>
                  We only use your email to deliver this OpenAI offer. See our{' '}
                  <a href="/contact">contact page</a> with any questions.
                </p>
              </form>
            </section>
          </>
        )}

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <span>Presented by BERG Collective · in partnership with OpenAI</span>
        </footer>
      </main>
    </div>
  );
}
