import { Link } from 'react-router-dom';
import styles from './EventsSection.module.css';

const imgWhitney = '/images/photos/lobby-whitney-people-dancing.jpg';
const imgSummit  = '/images/photos/TRVR8719.jpg';
const imgHoliday = '/images/photos/holiday-toy-drive-genisha-jordan.jpg';

const EVENTS = [
  {
    tag:      'Flagship · 2025',
    title:    'Whitney Museum Free Friday Night',
    meta:     'New York City · 5,000+ Attendees',
    img:      imgWhitney,
    alt:      'BERG members dancing at Whitney Museum Free Friday Night',
    featured: true,
  },
  {
    tag:      'Summit · 2025',
    title:    'OOO ERG Summit After Party',
    meta:     'New York City · 1,186 Attendees',
    img:      imgSummit,
    alt:      'BERG Collective OOO ERG Summit After Party',
    featured: false,
  },
  {
    tag:      'Community · 2025',
    title:    '7th Annual Holiday Mixer',
    meta:     'New York City · 800 Attendees',
    img:      imgHoliday,
    alt:      'BERG Collective 7th Annual Holiday Mixer toy drive',
    featured: false,
  },
];

export default function EventsSection() {
  return (
    <section className={styles.section} aria-labelledby="events-heading">
      <div className="container">

        {/* ── Header ── */}
        <div className={styles.header}>
          <div>
            <span className="section-label" style={{ color: 'var(--color-gold)' }}>
              Flagship Events
            </span>
            <h2 id="events-heading" className={styles.heading}>
              Where the community<br />comes alive.
            </h2>
          </div>
          <Link to="/events" className={styles.allEventsBtn}>
            View All Events
          </Link>
        </div>

        {/* ── Event cards grid ── */}
        <div className={styles.grid}>
          {EVENTS.map(({ tag, title, meta, img, alt, featured }) => (
            <article
              key={title}
              className={`${styles.card} ${featured ? styles.cardFeatured : ''}`}
            >
              <img
                src={img}
                alt={alt}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.overlay} aria-hidden="true" />
              <div className={styles.cardContent}>
                <span className={styles.eventTag}>{tag}</span>
                <h3 className={styles.eventTitle}>{title}</h3>
                <p className={styles.eventMeta}>{meta}</p>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
