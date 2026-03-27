import { Link } from 'react-router-dom';
import styles from './CommunityImpact.module.css';

const imgMain    = '/images/photos/berg members-whitney.jpg';
const imgToys    = '/images/photos/holiday-toy-drive-genisha-jordan.jpg';
const imgLeaders = '/images/photos/rich-ty-michelle-whitney.jpg';

const HIGHLIGHTS = [
  {
    num:  '900+',
    text: 'Toys distributed to children in NYC and LA shelters and low-income housing',
  },
  {
    num:  '800+',
    text: 'School supplies collected for students in Harlem, Brooklyn, and the Bronx',
  },
  {
    num:  '90%',
    text: 'Black vendor utilization across all events — DJs, photographers, caterers, and more',
  },
];

export default function CommunityImpact() {
  return (
    <section className={styles.section} aria-labelledby="community-heading">
      <div className={`${styles.grid} container`}>

        {/* ── Image mosaic ── */}
        <div className={styles.mosaic} aria-hidden="true">
          <img src={imgMain}    alt="BERG members at the Whitney Museum" className={styles.imgMain}    loading="lazy" />
          <img src={imgToys}    alt="Holiday toy drive"                  className={styles.imgSecond}  loading="lazy" />
          <img src={imgLeaders} alt="BERG leadership team"               className={styles.imgThird}   loading="lazy" />
        </div>

        {/* ── Content ── */}
        <div className={styles.content}>
          <span className="section-label">Community Impact</span>
          <h2 id="community-heading" className={styles.heading}>
            Giving back is<br />built into everything.
          </h2>
          <p className={styles.body}>
            Every BERG event includes a community giving component. In 2025, we
            collected 1,700+ items for underserved youth and invested $50,000+
            directly into Black-owned businesses.
          </p>

          <ul className={styles.highlights} aria-label="Community impact highlights">
            {HIGHLIGHTS.map(({ num, text }) => (
              <li key={num} className={styles.highlight}>
                <span className={styles.highlightNum}>{num}</span>
                <span className={styles.highlightText}>{text}</span>
              </li>
            ))}
          </ul>

          <Link to="/impact" className="link-arrow">
            Read the full 2025 Impact Report →
          </Link>
        </div>

      </div>
    </section>
  );
}
