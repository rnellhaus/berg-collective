import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.branding}>
          <div className={styles.logo}>
            BERG <span className={styles.badge}>CMS</span>
          </div>
          <p className={styles.subtitle}>Reset your password</p>
        </div>

        {sent ? (
          <>
            <div className={styles.success} role="status">
              If an account exists for that email, a reset link is on its way. The link expires in 1 hour.
            </div>
            <p className={styles.helpText}>
              <Link to="/admin/login" className={styles.link}>Back to sign in</Link>
            </p>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Your admin email"
                required
                disabled={submitting}
              />
            </div>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className={styles.helpText}>
              <Link to="/admin/login" className={styles.link}>Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
