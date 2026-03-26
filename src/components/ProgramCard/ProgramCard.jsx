import { Link } from 'react-router-dom';
import styles from './ProgramCard.module.css';

export default function ProgramCard({ image, title, description, linkText, linkTo }) {
  return (
    <div className={styles.card}>
      <img src={image} alt={title} loading="lazy" width={400} height={200} />
      <div className={styles.content}>
        <h3>{title}</h3>
        <p>{description}</p>
        <Link to={linkTo} className={styles.link}>
          {linkText} &rarr;
        </Link>
      </div>
    </div>
  );
}
