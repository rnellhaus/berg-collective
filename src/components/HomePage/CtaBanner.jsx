import { Link } from 'react-router-dom';
import styles from './CtaBanner.module.css';

export default function CtaBanner() {
  return (
    <section className={styles.banner} aria-label="Call to action">
      <h2 className={styles.heading}>
        Ready to bring your ERG into the BERG Collective?
      </h2>
      <div className={styles.actions}>
        <Link to="/membership" className={styles.btnBlack}>
          Apply for Membership
        </Link>
        <Link to="/impact" className={styles.btnOutline}>
          Download Impact Report
        </Link>
      </div>
    </section>
  );
}
