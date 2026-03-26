import { useEffect, useRef, useState } from 'react';
import OptimizedImage from '../OptimizedImage/OptimizedImage';
import styles from './PhotoGallery.module.css';

function parseHashIndex(photos) {
  try {
    const hash = window.location.hash;
    const match = hash.match(/^#gallery-(\d+)$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (!isNaN(idx) && idx >= 0 && idx < photos.length) return idx;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function PhotoGallery({ photos, eventTitle, initialIndex = 0, isOpen, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  const thumbRefs = useRef([]);
  const overlayRef = useRef(null);

  // On mount / open: read URL hash to set initial index
  useEffect(() => {
    if (!isOpen || !photos?.length) return;
    const hashIdx = parseHashIndex(photos);
    if (hashIdx !== null) {
      setCurrent(hashIdx);
    } else {
      setCurrent(initialIndex);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL hash on navigation
  useEffect(() => {
    if (!isOpen) return;
    window.location.hash = `gallery-${current}`;
  }, [current, isOpen]);

  // Clear hash on close
  useEffect(() => {
    if (!isOpen) {
      // Remove gallery hash without scrolling
      try {
        const url = window.location.href.replace(/#gallery-\d+$/, '').replace(/#$/, '');
        window.history.replaceState(null, '', url || window.location.pathname);
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(prev => wrap(prev - 1));
      if (e.key === 'ArrowRight') goTo(prev => wrap(prev + 1));
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen || !photos?.length) return;
    const preload = (idx) => {
      const media = photos[idx];
      if (!media) return;
      const src = media.webp_medium
        ? `/api/media/file/medium/${media.webp_medium.split('/').pop()}`
        : media.jpg_fallback
        ? `/api/media/file/fallback/${media.jpg_fallback.split('/').pop()}`
        : null;
      if (src) {
        const img = new Image();
        img.src = src;
      }
    };
    preload(wrap(current + 1));
    preload(wrap(current - 1));
  }, [current, isOpen, photos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!isOpen) return;
    const el = thumbRefs.current[current];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current, isOpen]);

  if (!isOpen || !photos?.length) return null;

  function wrap(idx) {
    return ((idx % photos.length) + photos.length) % photos.length;
  }

  function goTo(idxOrUpdater) {
    setCurrent(prev => {
      const next = typeof idxOrUpdater === 'function' ? idxOrUpdater(prev) : idxOrUpdater;
      return wrap(next);
    });
  }

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo gallery${eventTitle ? `: ${eventTitle}` : ''}`}
    >
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          {eventTitle && <p className={styles.eventTitle}>{eventTitle}</p>}
          <span className={styles.counter}>
            {current + 1} of {photos.length}
          </span>
        </div>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close gallery"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Main image area */}
      <div className={styles.imageArea}>
        {/* Left nav */}
        <button
          className={`${styles.navBtn} ${styles.navLeft}`}
          onClick={() => goTo(c => c - 1)}
          aria-label="Previous photo"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={styles.mainImage}>
          <OptimizedImage
            media={photos[current]}
            size="medium"
            alt={photos[current]?.alt_text || `Photo ${current + 1}`}
            loading="eager"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Right nav */}
        <button
          className={`${styles.navBtn} ${styles.navRight}`}
          onClick={() => goTo(c => c + 1)}
          aria-label="Next photo"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Swipe hint on mobile */}
        <span className={styles.swipeHint} aria-hidden="true">Swipe to navigate</span>
      </div>

      {/* Thumbnail strip */}
      <div className={styles.thumbStrip} role="list" aria-label="Photo thumbnails">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            ref={el => (thumbRefs.current[idx] = el)}
            className={`${styles.thumb}${idx === current ? ` ${styles.thumbActive}` : ''}`}
            onClick={() => goTo(idx)}
            aria-label={`View photo ${idx + 1}`}
            aria-current={idx === current ? 'true' : undefined}
            role="listitem"
          >
            <OptimizedImage
              media={photo}
              size="thumbnail"
              alt=""
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
