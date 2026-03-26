import HeroBanner from '../../components/HeroBanner/HeroBanner';
import Button from '../../components/Button/Button';
import styles from './ProgramsPage.module.css';

export default function ProgramsPage() {
  return (
    <main>
      {/* Hero */}
      <HeroBanner
        centered
        badge="Our Core Pillars"
        title="Empowering Black <span style='color:#8b3223'>Excellence</span>"
        subtitle="BERG Collective offers transformative programs designed to elevate Black professionals into positions of leadership, influence, and lasting impact."
      />

      {/* Leadership Development — flagship card */}
      <section className={styles.flagship}>
        <div className={styles.flagshipInner}>
          <div className={styles.flagshipImageWrap}>
            <img
              src="/images/photos/group-photo-berg-panel-whitney.jpg"
              alt="BERG panel discussion"
              className={styles.flagshipImage}
            />
            <span className={styles.flagshipBadge}>Flagship Program</span>
          </div>
          <div className={styles.flagshipContent}>
            <p className={styles.eyebrow}>Leadership Development</p>
            <h2 className={styles.flagshipTitle}>Executive Leadership Cohort</h2>
            <p className={styles.flagshipDesc}>
              Our most intensive program, built for senior professionals ready to step into board seats,
              C-suite roles, and executive leadership. Over 12 weeks you will work alongside peers and
              seasoned mentors to sharpen your strategic vision and expand your influence.
            </p>
            <ul className={styles.checklist}>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                C-Suite Mentorship
              </li>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                Board Readiness
              </li>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                Public Speaking
              </li>
            </ul>
            <Button variant="primary" href="#">Apply for Cohort</Button>
          </div>
        </div>
      </section>

      {/* Two secondary program cards */}
      <section className={styles.secondary}>
        <div className={styles.secondaryGrid}>
          <div className={styles.programCard}>
            <div className={styles.cardImageWrap}>
              <img
                src="/images/photos/whitney-womens-panel.jpg"
                alt="Career Growth"
                className={styles.cardImage}
              />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Career Growth</h3>
              <p className={styles.cardDesc}>
                Structured pathways for mid-level professionals looking to break into senior roles.
                Combines skills workshops, peer accountability groups, and one-on-one coaching.
              </p>
              <a className={styles.arrowLink} href="#">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className={styles.programCard}>
            <div className={styles.cardImageWrap}>
              <img
                src="/images/photos/whitney-art-activation.jpg"
                alt="Cultural Impact"
                className={styles.cardImage}
              />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Cultural Impact</h3>
              <p className={styles.cardDesc}>
                Amplify Black creative and entrepreneurial voices through art activations, community
                partnerships, and curated experiences that celebrate and sustain our culture.
              </p>
              <a className={styles.arrowLink} href="#">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to accelerate your journey?</h2>
          <p className={styles.ctaSubtitle}>
            Join hundreds of Black professionals who have transformed their careers through BERG programs.
          </p>
          <Button variant="white" href="#">Join BERG Today</Button>
        </div>
      </section>
    </main>
  );
}
