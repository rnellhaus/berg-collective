import { useState } from 'react';
import styles from './Newsletter.module.css';

const LISTS = [
  { id: 'la', label: 'Los Angeles', url: 'http://eepurl.com/iFBGps' },
  { id: 'nyc', label: 'NYC / Global', url: 'http://eepurl.com/iCmefM' },
];

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [selectedList, setSelectedList] = useState('nyc');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('submitting');
    setErrorMsg('');

    try {
      // Store in our database
      await fetch('/api/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, list: selectedList }),
      });

      // Open Mailchimp signup in new tab
      const list = LISTS.find(l => l.id === selectedList);
      if (list) {
        window.open(list.url, '_blank');
      }

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
          Get the latest on events, programs, and community updates delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className={styles.successWrap}>
            <p className={styles.successMsg}>Almost there! Complete your signup in the window that just opened.</p>
            <button
              className={styles.resetBtn}
              onClick={() => { setStatus('idle'); setEmail(''); }}
            >
              Subscribe another email
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Chapter selector */}
            <div className={styles.listSelector}>
              {LISTS.map(list => (
                <button
                  key={list.id}
                  type="button"
                  className={`${styles.listBtn} ${selectedList === list.id ? styles.listBtnActive : ''}`}
                  onClick={() => setSelectedList(list.id)}
                >
                  {list.label}
                </button>
              ))}
            </div>

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
