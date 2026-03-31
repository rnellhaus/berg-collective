import { Link } from 'react-router-dom';
import styles from './MissionSection.module.css';

const missionImage = 'https://qpbzvbrlnfxyvhnw.public.blob.vercel-storage.com/media/full/31-i-4fznBWM-X5.webp';

export default function MissionSection() {
  return (
    <section className={styles.section} aria-labelledby="mission-heading">
      <div className={`${styles.grid} container`}>

        {/* ── Image column ── */}
        <div className={styles.imageWrap}>
          <img
            src={missionImage}
            alt="BERG Collective leadership team"
            className={styles.image}
            loading="lazy"
          />
          <div className={styles.imageAccent} aria-hidden="true" />
        </div>

        {/* ── Content column ── */}
        <div className={styles.content}>
          <span className="section-label">Our Mission</span>
          <h2 id="mission-heading" className={styles.heading}>
            More than a network.<br />A movement.
          </h2>
          <p className={styles.body}>
            BERG Collective is a 501(c)(3) nonprofit comprising a collective of
            Black professionals representing Black Employee Resource Groups
            across tech, sports, and entertainment.
          </p>
          <p className={styles.body}>
            Our mission is to increase the network density and net worth of
            Black professionals by facilitating connection, professional
            development, and commerce — building pathways to the C-suite and
            beyond.
          </p>
          <Link to="/about" className="link-arrow">
            Read our full story →
          </Link>
        </div>

      </div>
    </section>
  );
}
