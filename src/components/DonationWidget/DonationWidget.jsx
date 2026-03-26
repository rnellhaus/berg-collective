import { useState } from 'react';
import styles from './DonationWidget.module.css';

const amounts = [25, 50, 100, 250];

export default function DonationWidget() {
  const [frequency, setFrequency] = useState('one-time');
  const [selectedAmount, setSelectedAmount] = useState(50);

  return (
    <div className={styles.widget}>
      <div className={styles.toggleRow}>
        <button
          className={`${styles.toggle} ${frequency === 'one-time' ? styles.active : ''}`}
          onClick={() => setFrequency('one-time')}
          aria-pressed={frequency === 'one-time'}
        >
          One Time
        </button>
        <button
          className={`${styles.toggle} ${frequency === 'monthly' ? styles.active : ''}`}
          onClick={() => setFrequency('monthly')}
          aria-pressed={frequency === 'monthly'}
        >
          Monthly
        </button>
      </div>

      <div className={styles.amountGrid}>
        {amounts.map((amt) => (
          <button
            key={amt}
            className={`${styles.amountBtn} ${selectedAmount === amt ? styles.selected : ''}`}
            onClick={() => setSelectedAmount(amt)}
            aria-pressed={selectedAmount === amt}
          >
            ${amt}
          </button>
        ))}
      </div>

      <a
        href="https://www.bergcollective.org/donate"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cta}
      >
        Donate ${selectedAmount} {frequency === 'monthly' ? '/month' : 'Now'}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12H19M19 12L12 5M19 12L12 19" /></svg>
      </a>

      <div className={styles.badges}>
        <span>Secure</span>
        <span>Tax-Deductible</span>
      </div>
    </div>
  );
}
