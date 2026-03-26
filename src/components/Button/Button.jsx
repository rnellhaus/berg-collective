import { Link } from 'react-router-dom';
import styles from './Button.module.css';

export default function Button({ to, href, variant = 'primary', children, className, ...props }) {
  const cls = `${styles.btn} ${styles[variant]} ${className || ''}`.trim();

  if (href) {
    return <a href={href} className={cls} {...props}>{children}</a>;
  }
  if (to) {
    return <Link to={to} className={cls} {...props}>{children}</Link>;
  }
  return <button className={cls} {...props}>{children}</button>;
}
