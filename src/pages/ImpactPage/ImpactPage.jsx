import StatCard from '../../components/StatCard/StatCard';
import DonationWidget from '../../components/DonationWidget/DonationWidget';
import DonutChart from '../../components/DonutChart/DonutChart';
import Button from '../../components/Button/Button';
import styles from './ImpactPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

export default function ImpactPage() {
  usePageMeta('Impact', 'See how BERG Collective is driving change for Black professionals.');
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <span className={styles.badge}>Annual Report 2024</span>
            <h1 className={styles.heroTitle}>
              Empowering Leadership,{' '}
              <span className={styles.gold}>Transforming Futures.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Every dollar invested, every member empowered, every event held — it all adds up to
              lasting change in the Black professional community. Here's what we accomplished
              together in 2024.
            </p>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.statsGrid}>
              <StatCard number="$5M+" label="Invested" description="Capital deployed into Black-owned businesses" />
              <StatCard number="2,400+" label="Members" description="Black professionals in our network" />
              <StatCard number="100%" label="Black-Owned" description="All partner businesses and vendors" />
              <StatCard number="50+" label="Events" description="Networking and development events this year" />
            </div>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className={styles.donationSection}>
        <div className={styles.donationInner}>
          <div className={styles.donationLeft}>
            <span className={styles.eyebrow}>Make an Impact</span>
            <h2 className={styles.donationTitle}>Join the Movement</h2>
            <p className={styles.donationDesc}>
              Your contribution directly fuels mentorship programs, business development workshops,
              and community events that empower Black professionals and entrepreneurs nationwide.
            </p>
            <DonationWidget />
          </div>
          <div className={styles.donationRight}>
            <div className={styles.stewardshipCard}>
              <h3 className={styles.stewardshipTitle}>Financial Stewardship</h3>
              <p className={styles.stewardshipSubtitle}>
                We are committed to transparent, responsible use of every dollar donated.
              </p>
              <div className={styles.chartWrapper}>
                <DonutChart percentage={85} label="To Programs" />
              </div>
              <div className={styles.breakdown}>
                <div className={styles.breakdownItem}>
                  <div className={styles.breakdownLabel}>
                    <span className={styles.breakdownDot} style={{ background: '#8b3223' }} />
                    <span>Programs &amp; Services</span>
                  </div>
                  <div className={styles.breakdownBarTrack}>
                    <div className={styles.breakdownBar} style={{ width: '85%', background: '#8b3223' }} />
                  </div>
                  <span className={styles.breakdownPct}>85%</span>
                </div>
                <div className={styles.breakdownItem}>
                  <div className={styles.breakdownLabel}>
                    <span className={styles.breakdownDot} style={{ background: '#B59410' }} />
                    <span>Operations</span>
                  </div>
                  <div className={styles.breakdownBarTrack}>
                    <div className={styles.breakdownBar} style={{ width: '10%', background: '#B59410' }} />
                  </div>
                  <span className={styles.breakdownPct}>10%</span>
                </div>
                <div className={styles.breakdownItem}>
                  <div className={styles.breakdownLabel}>
                    <span className={styles.breakdownDot} style={{ background: '#8e5f57' }} />
                    <span>Fundraising</span>
                  </div>
                  <div className={styles.breakdownBarTrack}>
                    <div className={styles.breakdownBar} style={{ width: '5%', background: '#8e5f57' }} />
                  </div>
                  <span className={styles.breakdownPct}>5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Make a Difference?</h2>
          <p className={styles.ctaDesc}>Join thousands of members building a stronger future for Black professionals.</p>
          <div className={styles.ctaButtons}>
            <Button to="/join" variant="primary">Become a Member</Button>
            <Button to="/donate" variant="outline">Donate Today</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
