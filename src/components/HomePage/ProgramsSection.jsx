import { Link } from 'react-router-dom';
import styles from './ProgramsSection.module.css';

const imgLeadership = '/images/photos/berg-summer mixer.jpg';
const imgCareer     = '/images/photos/whitney-womens-panel.jpg';
const imgCulture    = '/images/photos/amy-sherald-exhibit.jpg';

const PROGRAMS = [
  {
    tag:   'Leadership',
    title: 'Leadership Development',
    body:  'Executive coaching, board placement initiatives, and C-suite access programs connecting Black professionals with industry veterans.',
    to:    '/programs#leadership',
    img:   imgLeadership,
    alt:   'BERG leadership development event',
  },
  {
    tag:   'Career Growth',
    title: 'Career Growth',
    body:  'Mentorship matching, skill-building workshops, and financial empowerment series — from salary negotiation to AI upskilling.',
    to:    '/programs#career',
    img:   imgCareer,
    alt:   'BERG women\'s panel discussion',
  },
  {
    tag:   'Cultural Impact',
    title: 'Cultural Impact',
    body:  'Preserving heritage and fostering community dialogue through art activations, cultural events, and community giving initiatives.',
    to:    '/programs#culture',
    img:   imgCulture,
    alt:   'Amy Sherald exhibition at the Whitney Museum',
  },
];

export default function ProgramsSection() {
  return (
    <section className={styles.section} aria-labelledby="programs-heading">
      <div className="container">

        {/* ── Header row ── */}
        <div className={styles.header}>
          <div>
            <span className="section-label">Our Programs</span>
            <h2 id="programs-heading" className={styles.heading}>
              Three Pillars<br />of Excellence
            </h2>
          </div>
          <Link to="/programs" className="link-arrow">
            View all programs →
          </Link>
        </div>

        {/* ── Cards grid ── */}
        <div className={styles.grid}>
          {PROGRAMS.map(({ tag, title, body, to, img, alt }) => (
            <article key={title} className={styles.card}>
              <div className={styles.imageWrap}>
                <img
                  src={img}
                  alt={alt}
                  className={styles.image}
                  loading="lazy"
                />
              </div>
              <div className={styles.body}>
                <span className={styles.tag}>{tag}</span>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardBody}>{body}</p>
                <Link to={to} className={styles.cardLink}>
                  Explore →
                </Link>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
