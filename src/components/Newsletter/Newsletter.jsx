import { useState, useEffect } from 'react';
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
  const [showLightbox, setShowLightbox] = useState(false);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (showLightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showLightbox]);

  // Close on Escape
  useEffect(() => {
    if (!showLightbox) return;
    const handleKey = (e) => { if (e.key === 'Escape') setShowLightbox(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showLightbox]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('submitting');
    setErrorMsg('');

    try {
      await fetch('/api/forms/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, list: selectedList }),
      });

      // Open Mailchimp form in lightbox instead of new tab
      setShowLightbox(true);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const list = LISTS.find(l => l.id === selectedList);

  return (
    <>
      <section className={styles.section}>
        <div className={styles.inner}>
          <span className={styles.label}>STAY CONNECTED</span>
          <h2 className={styles.heading}>Join Our Newsletter</h2>
          <p className={styles.subtitle}>
            Get the latest on events, programs, and community updates delivered to your inbox.
          </p>

          {status === 'success' && !showLightbox ? (
            <div className={styles.successWrap}>
              <p className={styles.successMsg}>You're subscribed!</p>
              <button
                className={styles.resetBtn}
                onClick={() => { setStatus('idle'); setEmail(''); }}
              >
                Subscribe another email
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.listSelector}>
                {LISTS.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    className={`${styles.listBtn} ${selectedList === l.id ? styles.listBtnActive : ''}`}
                    onClick={() => setSelectedList(l.id)}
                  >
                    {l.label}
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

      {/* Mailchimp Lightbox */}
      {showLightbox && list && (
        <div className={styles.lightboxOverlay} onClick={() => setShowLightbox(false)}>
          <div className={styles.lightboxModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <div>
                <h3 className={styles.lightboxTitle}>Complete Your Signup</h3>
                <p className={styles.lightboxSubtitle}>{list.label} Newsletter</p>
              </div>
              <button className={styles.lightboxClose} onClick={() => setShowLightbox(false)} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={styles.lightboxBody}>
              <iframe
                src={list.url}
                title={`${list.label} Newsletter Signup`}
                className={styles.lightboxIframe}
              />
            </div>
            <div className={styles.lightboxFooter}>
              <span className={styles.lightboxSecure}>Powered by Mailchimp</span>
              <a href={list.url} target="_blank" rel="noopener noreferrer" className={styles.lightboxExternal}>
                Open in new tab ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
