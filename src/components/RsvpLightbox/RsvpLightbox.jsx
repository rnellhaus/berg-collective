import { useEffect, useRef, useState } from 'react';
import styles from './RsvpLightbox.module.css';

function loadLumaScript() {
  if (document.querySelector('script[src*="lu.ma/embed-checkout"]')) return;
  const script = document.createElement('script');
  script.src = 'https://www.lu.ma/embed-checkout/v1/index.js';
  script.async = true;
  document.head.appendChild(script);
}

export default function RsvpLightbox({ event, isOpen, onClose }) {
  const [toast, setToast] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const lumaBtnRef = useRef(null);
  const overlayRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const timeoutRef = useRef(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    if (firstFocusableRef.current) firstFocusableRef.current.focus();
  }, [isOpen]);

  // Lu.ma overlay strategy
  useEffect(() => {
    if (!isOpen || !event) return;
    if (event.rsvp_strategy === 'overlay') {
      loadLumaScript();
      // Give script a moment to initialize, then click
      const t = setTimeout(() => {
        if (lumaBtnRef.current) lumaBtnRef.current.click();
        onClose();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, event, onClose]);

  // Iframe 5-second fallback timeout
  useEffect(() => {
    if (!isOpen || !event || event.rsvp_strategy !== 'iframe') return;
    setIframeFailed(false);
    timeoutRef.current = setTimeout(() => {
      setIframeFailed(true);
      window.open(event.rsvp_url, '_blank');
      onClose();
    }, 5000);
    return () => clearTimeout(timeoutRef.current);
  }, [isOpen, event, onClose]);

  // External strategy
  useEffect(() => {
    if (!isOpen || !event) return;
    if (event.rsvp_strategy === 'external') {
      window.open(event.rsvp_url, '_blank');
      setToast(true);
      const t = setTimeout(() => {
        setToast(false);
        onClose();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [isOpen, event, onClose]);

  if (!event) return null;

  const strategy = event.rsvp_strategy;

  // Lu.ma overlay: render hidden trigger button only
  if (strategy === 'overlay') {
    return (
      <button
        ref={lumaBtnRef}
        className={styles.lumaBtn}
        data-luma-action="checkout"
        data-luma-event-id={event.rsvp_event_id}
        aria-hidden="true"
        tabIndex={-1}
      >
        RSVP
      </button>
    );
  }

  // External: render only the toast
  if (strategy === 'external') {
    return toast ? (
      <div className={styles.toast} role="status" aria-live="polite">
        Opening registration in a new tab...
      </div>
    ) : null;
  }

  // Iframe strategy
  if (!isOpen) return null;

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleIframeError() {
    clearTimeout(timeoutRef.current);
    window.open(event.rsvp_url, '_blank');
    onClose();
  }

  function handleIframeLoad() {
    // Iframe loaded successfully — cancel the fallback timeout
    clearTimeout(timeoutRef.current);
  }

  const platform = event.rsvp_platform || 'external';

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`RSVP for ${event.title}`}
    >
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.bergIcon} aria-hidden="true">B</div>
          <div className={styles.headerText}>
            <p className={styles.headerTitle}>{event.title}</p>
            <p className={styles.headerSubtitle}>via {platform}</p>
          </div>
          <button
            ref={firstFocusableRef}
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close RSVP modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Iframe body */}
        <div className={styles.iframeBody}>
          <iframe
            src={event.rsvp_url}
            title={`RSVP for ${event.title}`}
            onError={handleIframeError}
            onLoad={handleIframeLoad}
            allow="payment"
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.secureLabel}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            Secure connection
          </span>
          <a
            href={event.rsvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openLink}
          >
            Open in new tab ↗
          </a>
        </div>
      </div>
    </div>
  );
}
