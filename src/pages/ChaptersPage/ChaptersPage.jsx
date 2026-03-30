import { useState } from 'react';
import Button from '../../components/Button/Button';
import styles from './ChaptersPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const chapters = {
  nyc: {
    name: 'New York City',
    focus: 'Finance & Media',
    members: '9,294',
    leaders: 'Evol G.',
    event: 'The Oxtail Off Tour 2026 - NYC',
    eventDate: 'Jun 7',
  },
  la: {
    name: 'Los Angeles, CA',
    focus: 'Creative & Tech Hub',
    members: '2,100',
    leaders: 'Rich N.',
    event: 'First Fridays - MOCA Museum',
    eventDate: 'Apr 3',
  },
};

const cityList = [
  { key: 'nyc', label: 'New York City' },
  { key: 'la', label: 'Los Angeles, CA' },
];

export default function ChaptersPage() {
  usePageMeta('Chapters', 'Find a BERG Collective chapter near you.');
  const [selectedCity, setSelectedCity] = useState('nyc');
  const chapter = chapters[selectedCity];

  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>Chapters</p>
          <h1 className={styles.heroTitle}>Connect Locally, Lead Globally</h1>
          <p className={styles.heroSubtitle}>
            BERG chapters bring our mission to life in cities across the country — connecting Black
            professionals locally while building a unified global network of leaders.
          </p>
          <div className={styles.heroActions}>
            <Button variant="gold" href="#">Find Your Chapter</Button>
            <Button variant="outline" href="#">Start a Chapter</Button>
          </div>
        </div>
      </section>

      {/* Chapter Selector */}
      <section className={styles.selector}>
        <div className={styles.selectorInner}>
          <div className={styles.selectorLeft}>
            <h2 className={styles.selectorHeading}>Our Chapters</h2>
            <ul className={styles.cityList}>
              {cityList.map(({ key, label }) => (
                <li key={key}>
                  <button
                    className={`${styles.cityCard} ${selectedCity === key ? styles.cityCardActive : ''}`}
                    onClick={() => setSelectedCity(key)}
                  >
                    <span className={styles.cityName}>{label}</span>
                    <span className={styles.cityFocus}>{chapters[key].focus}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.selectorRight}>
            <div className={styles.chapterDetail}>
              <h3 className={styles.detailCity}>{chapter.name}</h3>
              <p className={styles.detailFocus}>{chapter.focus}</p>
              <div className={styles.detailStats}>
                <div className={styles.detailStat}>
                  <span className={styles.detailStatNumber}>{chapter.members}</span>
                  <span className={styles.detailStatLabel}>Members</span>
                </div>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Chapter Leaders</span>
                <span className={styles.detailValue}>{chapter.leaders}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Upcoming Event</span>
                <span className={styles.detailValue}>
                  {chapter.event} &mdash; {chapter.eventDate}
                </span>
              </div>
              <Button variant="primary" href="#">Join This Chapter</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Don't see your city?</h2>
          <p className={styles.ctaSubtitle}>
            BERG is growing. Help bring our mission to your community by starting a new chapter.
          </p>
          <Button variant="gold" href="#">Start a Chapter</Button>
        </div>
      </section>
    </main>
  );
}
