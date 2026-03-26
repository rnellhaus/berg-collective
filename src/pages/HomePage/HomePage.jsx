import styles from './HomePage.module.css';
import Button from '../../components/Button/Button';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import StatCard from '../../components/StatCard/StatCard';
import ProgramCard from '../../components/ProgramCard/ProgramCard';
import ChapterCard from '../../components/ChapterCard/ChapterCard';
import usePageMeta from '../../hooks/usePageMeta';

export default function HomePage() {
  usePageMeta(null, 'A collective dedicated to elevating voices, fostering executive leadership, and building generational wealth for Black professionals.');
  return (
    <main>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>
              <span className={styles.pulseDot} />
              Now accepting members
            </div>
            <h1 className={styles.heroTitle}>
              Empowering Black Professionals to{' '}
              <span style={{ color: '#8b3223' }}>Lead and Thrive</span>
            </h1>
            <p className={styles.heroSubtitle}>
              BERG Collective is a premier network of Black executives, entrepreneurs, and rising
              leaders — united by purpose, elevated by community.
            </p>
            <div className={styles.heroActions}>
              <Button to="/join" variant="primary">Join the Collective</Button>
              <Button to="/programs" variant="outline">View Programs</Button>
            </div>
            <div className={styles.socialProof}>
              <div className={styles.avatarStack}>
                <img
                  src="/images/photos/rich-headshot-new.jpg"
                  alt="Member"
                  className={styles.avatar}
                />
                <img
                  src="/images/photos/evol-headshot.jpg"
                  alt="Member"
                  className={styles.avatar}
                />
                <img
                  src="/images/photos/michelle-amy-sherald-whitney.jpg"
                  alt="Member"
                  className={styles.avatar}
                />
                <img
                  src="/images/photos/whitney-womens-panel.jpg"
                  alt="Member"
                  className={styles.avatar}
                />
              </div>
              <p className={styles.socialProofText}>
                <strong>+2k</strong> joined this month
              </p>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroImageWrap}>
              <img
                src="/images/photos/berg%20member-female-backdrop.jpg"
                alt="BERG Collective member"
                className={styles.heroImage}
              />
              <div className={styles.heroGradient} />
              <div className={styles.heroCaption}>
                Dr. Alisha Moore / Chief Technology Officer, Nexus Inc.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Bar */}
      <section className={styles.logoBar}>
        <div className={styles.logoBarInner}>
          <span className={styles.featuredLabel}>Featured BERG Companies</span>
          <div className={styles.logos}>
            <span className={`${styles.logo} ${styles.logoDisney}`}>Disney</span>
            <span className={`${styles.logo} ${styles.logoBetterment}`}>betterment</span>
            <span className={`${styles.logo} ${styles.logoNfl}`}>NFL</span>
            <span className={`${styles.logo} ${styles.logoNetflix}`}>NETFLIX</span>
            <span className={`${styles.logo} ${styles.logoLoreal}`}>L'ORÉAL</span>
            <span className={`${styles.logo} ${styles.logoDowjones}`}>Dow Jones</span>
            <span className={`${styles.logo} ${styles.logoFortune}`}>FORTUNE</span>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className={styles.mission}>
        <div className={styles.missionInner}>
          <div className={styles.missionLeft}>
            <div className={styles.missionImageWrap}>
              <img
                src="/images/photos/michelle-amy-sherald-whitney.jpg"
                alt="Michelle at the Whitney Museum"
                className={styles.missionImage}
              />
              <div className={styles.goldAccent} />
            </div>
          </div>
          <div className={styles.missionRight}>
            <p className={styles.eyebrow}>Our Mission</p>
            <h2 className={styles.missionTitle}>
              More than a network.{' '}
              <span style={{ color: '#B59410' }}>A movement.</span>
            </h2>
            <p className={styles.missionBody}>
              We believe that Black excellence is not an exception — it is a standard. BERG
              Collective exists to build the systems, relationships, and resources that make that
              standard the norm across every industry.
            </p>
            <p className={styles.missionBody}>
              From boardrooms to nonprofits, from startups to Fortune 500s, our members are
              reshaping what leadership looks like in America — and the world.
            </p>
            <Button to="/about" variant="link">Read our full mission</Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          <StatCard number="10k+" label="Active Members" description="Professionals across every industry" />
          <StatCard number="50+" label="Cities" description="Chapters in major metro areas nationwide" />
          <StatCard number="$5M+" label="Scholarships" description="Awarded to BERG members and their families" />
        </div>
      </section>

      {/* Programs Section */}
      <section className={styles.programs}>
        <div className={styles.programsInner}>
          <SectionHeader eyebrow="What We Offer" title="Programs Built for Black Excellence" centered />
          <div className={styles.programsGrid}>
            <ProgramCard
              image="/images/photos/whitney-art-activation.jpg"
              title="Executive Mentorship"
              description="Connect with C-suite leaders and senior executives who are invested in your growth. Our mentorship program matches you with seasoned professionals for 1:1 guidance."
              linkText="Learn more"
              linkTo="/programs/mentorship"
            />
            <ProgramCard
              image="/images/photos/group-photo-berg-panel-whitney.jpg"
              title="Leadership Summit"
              description="Our flagship annual summit brings together 500+ Black leaders for three days of high-impact programming, keynotes, and networking across industries."
              linkText="Learn more"
              linkTo="/programs/summit"
            />
            <ProgramCard
              image="/images/photos/BERGCollectiveHolidayMixer2023-048.jpg"
              title="Scholarship Fund"
              description="BERG Collective awards scholarships to emerging Black professionals pursuing graduate degrees, professional certifications, and continuing education."
              linkText="Learn more"
              linkTo="/programs/scholarships"
            />
          </div>
        </div>
      </section>

      {/* Chapters Section */}
      <section className={styles.chapters}>
        <div className={styles.chaptersInner}>
          <SectionHeader eyebrow="Our Chapters" title="Find Your Community" centered />
          <div className={styles.chaptersGrid}>
            <ChapterCard
              name="New York, NY"
              established="2018"
              members="1,200"
              description="The New York chapter is our flagship community, hosting monthly mixers, executive panels, and cultural activations across Manhattan, Brooklyn, and the Bronx."
              linkTo="/chapters/new-york"
            />
            <ChapterCard
              name="Los Angeles, CA"
              established="2019"
              members="950"
              description="LA's chapter bridges entertainment, tech, and entrepreneurship — connecting Black creatives and executives across one of the world's most dynamic cities."
              linkTo="/chapters/los-angeles"
            />
          </div>
          <div className={styles.chaptersAction}>
            <Button to="/chapters" variant="white">View All Chapters</Button>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className={styles.events}>
        <div className={styles.eventsInner}>
          <SectionHeader eyebrow="Upcoming Events" title="Join Us in Person" centered />
          <div className={styles.eventsEmbed}>
            <iframe
              src="https://lu.ma/embed/calendar/cal-9G1l2B4Yfuft3mf/events"
              width="100%"
              height="560"
              frameBorder="0"
              style={{ border: '1px solid #e8e1da', borderRadius: '8px' }}
              allowFullScreen
              aria-hidden="false"
              tabIndex="0"
              title="BERG Collective Events Calendar"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Elevate Your Career?</h2>
          <p className={styles.ctaSubtitle}>
            Join thousands of Black professionals who are leading with purpose and building
            generational impact through BERG Collective.
          </p>
          <div className={styles.ctaActions}>
            <Button to="/join" variant="white">Join the Collective</Button>
            <Button to="/about" variant="outline">Learn More</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
