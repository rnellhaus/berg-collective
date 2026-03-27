import { useState } from 'react';
import styles from './Newsletter.module.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Subscription failed. Please try again.');
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.label}>STAY CONNECTED</span>
        <h2 className={styles.heading}>Join Our Newsletter</h2>
        <p className={styles.subtitle}>
          Get the latest on events, programs, and community updates.
        </p>

        {status === 'success' ? (
          <p className={styles.successMsg}>You're subscribed!</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.inputRow}>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
              />
              <button
                type="submit"
                className={styles.subscribeBtn}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
            {status === 'error' && (
              <p className={styles.errorMsg}>{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
