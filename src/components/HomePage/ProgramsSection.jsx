import { Link } from 'react-router-dom';
import styles from './ProgramsSection.module.css';

const imgFinancial   = '/images/photos/i-QdZRfh3-X5.jpg';
const imgNetworking  = '/images/photos/R5TF1211.jpg';
const imgCareer      = '/images/photos/whitney-womens-panel.jpg';

const PROGRAMS = [
  {
    tag:   'Financial Empowerment',
    title: 'Financial Empowerment',
    body:  'Building generational wealth starts with financial literacy. Expert-led workshops on investment strategy, compensation negotiation, and wealth-building.',
    to:    '/programs',
    img:   imgFinancial,
    alt:   'BERG financial empowerment session',
  },
  {
    tag:   'Structured Networking',
    title: 'Structured Networking',
    body:  'Curated networking experiences that pair professionals across industries and career stages, creating relationships that open doors and spark collaborations.',
    to:    '/programs',
    img:   imgNetworking,
    alt:   'BERG structured networking event',
  },
  {
    tag:   'Career Growth',
    title: 'Career Growth',
    body:  'Structured pathways, mentorship, and skill development designed to help mid-level professionals break into senior leadership and C-suite roles.',
    to:    '/programs',
    img:   imgCareer,
    alt:   'BERG career growth programming',
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
