import { useState } from 'react';
import Button from '../../components/Button/Button';
import styles from './ChaptersPage.module.css';

const chapters = {
  atlanta: {
    name: 'Atlanta, GA',
    focus: 'Entrepreneurship & Culture',
    members: '2,500',
    leaders: 'Marcus T. & Sarah J.',
    event: 'Spring Networking Mixer',
    eventDate: 'Mar 12',
  },
  nyc: {
    name: 'New York City',
    focus: 'Finance & Media',
    members: '3,457',
    leaders: 'Evol G. & Michael R.',
    event: 'Finance Leaders Summit',
    eventDate: 'Mar 18',
  },
  la: {
    name: 'Los Angeles, CA',
    focus: 'Creative & Tech Hub',
    members: '2,100',
    leaders: 'Richard N. & Tanya M.',
    event: 'Tech & Entertainment Mixer',
    eventDate: 'Mar 25',
  },
  dc: {
    name: 'Washington, DC',
    focus: 'Policy & Government',
    members: '1,800',
    leaders: 'Angela W. & David K.',
    event: 'Policy Leadership Forum',
    eventDate: 'Apr 05',
  },
};

const cityList = [
  { key: 'atlanta', label: 'Atlanta, GA' },
  { key: 'nyc', label: 'New York City' },
  { key: 'la', label: 'Los Angeles, CA' },
  { key: 'dc', label: 'Washington, DC' },
];

export default function ChaptersPage() {
  const [selectedCity, setSelectedCity] = useState('atlanta');
  const chapter = chapters[selectedCity];

  return (
    <main>
      {/* Hero — two column */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <h1
              className={styles.heroTitle}
              dangerouslySetInnerHTML={{
                __html: "Connect Locally, <span style='color:#B59410'>Lead Globally.</span>",
              }}
            />
            <p className={styles.heroSubtitle}>
              BERG chapters bring our mission to life in cities across the country — connecting Black
              professionals locally while building a unified global network of leaders.
            </p>
            <div className={styles.heroActions}>
              <Button variant="primary" href="#">Find Your Chapter</Button>
              <Button variant="outline" href="#">Start a Chapter</Button>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>12</span>
                <span className={styles.statLabel}>Active Hubs</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNumber}>5k+</span>
                <span className={styles.statLabel}>Global Members</span>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroImageWrap}>
              <img
                src="/images/photos/group-photo-berg-panel-whitney.jpg"
                alt="BERG chapter gathering"
                className={styles.heroImage}
              />
              <div className={styles.floatingBadge}>
                <span className={styles.floatingBadgeText}>Global Network</span>
              </div>
            </div>
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
          <Button variant="white" href="#">Start a Chapter</Button>
        </div>
      </section>
    </main>
  );
}
