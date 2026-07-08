import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './LoginPage.module.css';

const GSI_SCRIPT_ID = 'google-gsi-client';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sign-in method config comes from the server so it can be flipped via
  // env vars (GOOGLE_CLIENT_ID, ALLOW_PASSWORD_LOGIN) without a rebuild.
  const [config, setConfig] = useState(null);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConfig(data || { googleClientId: null, passwordLoginEnabled: true }))
      .catch(() => setConfig({ googleClientId: null, passwordLoginEnabled: true }));
  }, []);

  const handleGoogleCredential = useCallback(
    async (response) => {
      setError('');
      setSubmitting(true);
      try {
        await loginWithGoogle(response.credential);
        navigate('/admin');
      } catch (err) {
        setError(err.message || 'Google sign-in failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithGoogle, navigate]
  );

  // Load the Google Identity Services script and render the button.
  useEffect(() => {
    if (!config?.googleClientId || !googleBtnRef.current) return;

    function renderButton() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 300,
      });
    }

    const existing = document.getElementById(GSI_SCRIPT_ID);
    if (existing) {
      renderButton();
      return;
    }
    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [config, handleGoogleCredential]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const showGoogle = !!config?.googleClientId;
  const showPassword = config ? config.passwordLoginEnabled : false;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.branding}>
          <div className={styles.logo}>
            BERG <span className={styles.badge}>CMS</span>
          </div>
          <p className={styles.subtitle}>Sign in to manage your content</p>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        {showGoogle && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 4px' }}>
            <div ref={googleBtnRef} />
          </div>
        )}

        {showGoogle && showPassword && (
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '18px 0 6px',
              color: '#9c8a86',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: '#e8e1da' }} />
            or
            <span style={{ flex: 1, height: '1px', background: '#e8e1da' }} />
          </div>
        )}

        {showPassword && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={submitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
            </div>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            <p className={styles.helpText}>
              <Link to="/admin/forgot-password" className={styles.link}>Forgot your password?</Link>
            </p>
          </form>
        )}

        {config && !showGoogle && !showPassword && (
          <p className={styles.helpText}>
            No sign-in methods are configured. Contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
}
