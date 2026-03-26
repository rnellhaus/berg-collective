import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className={styles.homeLink}>Back to Home</Link>
    </div>
  );
}
