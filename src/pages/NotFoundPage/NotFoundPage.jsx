import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta('Page Not Found', 'This page does not exist.');
  return (
    <div className={styles.page}>
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className={styles.homeLink}>Back to Home</Link>
    </div>
  );
}
