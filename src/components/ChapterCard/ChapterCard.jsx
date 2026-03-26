import { Link } from 'react-router-dom';
import styles from './ChapterCard.module.css';

export default function ChapterCard({ name, established, members, description, linkTo }) {
  return (
    <div className={styles.card}>
      <h3>{name}</h3>
      <p className={styles.meta}>Est. {established} &bull; {members} Members</p>
      <p className={styles.desc}>{description}</p>
      <Link to={linkTo} className={styles.link}>Explore {name.split(',')[0]} Chapter &rarr;</Link>
    </div>
  );
}
