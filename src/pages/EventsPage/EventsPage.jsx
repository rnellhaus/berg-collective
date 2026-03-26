import { useEffect } from 'react';
import Button from '../../components/Button/Button';
import styles from './EventsPage.module.css';

export default function EventsPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://embed.lu.ma/checkout-button.js';
    script.id = 'luma-checkout';
    document.body.appendChild(script);
    return () => {
      const s = document.getElementById('luma-checkout');
      if (s) s.remove();
    };
  }, []);

  return (
    <main>
      {/* Hero — two column */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <span className={styles.badge}>Events &amp; Summits</span>
            <h1
              className={styles.heroTitle}
              dangerouslySetInnerHTML={{
                __html: "Elevate Your <span style='color:#8b3223'>Leadership Journey</span>",
              }}
            />
            <p className={styles.heroSubtitle}>
              From intimate workshops to large-scale summits, BERG events connect you with the ideas,
              people, and opportunities that move your career forward.
            </p>
            <div className={styles.heroActions}>
              <Button variant="primary" href="#">Browse Events</Button>
              <Button variant="outline" href="#">Become a Member</Button>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroImageWrap}>
              <img
                src="/images/photos/DTRT-crowd-photo.jpg"
                alt="BERG crowd event"
                className={styles.heroImage}
              />
              <div className={styles.floatingBadge}>
                <span className={styles.floatingBadgeText}>Global Community</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Event */}
      <section className={styles.featured}>
        <div className={styles.featuredHeader}>
          <p className={styles.sectionEyebrow}>Don't Miss</p>
          <h2 className={styles.sectionTitle}>Featured Event</h2>
        </div>
        <div className={styles.featuredCard}>
          <div className={styles.featuredImageArea}>
            <span className={styles.featuredBadge}>Featured</span>
          </div>
          <div className={styles.featuredContent}>
            <span className={styles.eventTag}>Finance</span>
            <h3 className={styles.featuredTitle}>Financial Empowerment Series</h3>
            <p className={styles.featuredDesc}>
              A deep-dive series for Black finance professionals and entrepreneurs. Covering wealth
              building, investment strategies, and navigating corporate finance at the highest levels.
            </p>
            <div className={styles.featuredMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📅</span>
                <span>January 21, 2026</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaIcon}>📍</span>
                <span>New York City</span>
              </div>
            </div>
            <Button variant="primary" href="#">Register Now</Button>
          </div>
        </div>
      </section>

      {/* Lu.ma Calendar */}
      <section className={styles.calendar}>
        <div className={styles.calendarInner}>
          <div className={styles.calendarHeader}>
            <p className={styles.sectionEyebrow}>Full Schedule</p>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
          </div>
          <div className={styles.iframeWrap}>
            <iframe
              src="https://lu.ma/embed/calendar/cal-4Cn87yDjbEDdWTK/events"
              width="100%"
              height="600"
              frameBorder="0"
              style={{ border: '1px solid #e8e1da', borderRadius: '12px' }}
              allowFullScreen
              aria-hidden="false"
              tabIndex="0"
              title="BERG Events Calendar"
            />
          </div>
          <div className={styles.calendarLink}>
            <a
              href="https://lu.ma/berg"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.lumaLink}
            >
              View All on Lu.ma <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Never Miss an Event</h2>
          <p className={styles.ctaSubtitle}>
            Members get early access, discounted tickets, and exclusive invitations to private BERG gatherings.
          </p>
          <Button variant="white" href="#">Become a Member</Button>
        </div>
      </section>
    </main>
  );
}
