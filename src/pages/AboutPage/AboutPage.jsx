import styles from './AboutPage.module.css';
import Button from '../../components/Button/Button';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import usePageMeta from '../../hooks/usePageMeta';

export default function AboutPage() {
  usePageMeta('About', 'Learn about BERG Collective\'s mission to empower Black professionals.');
  return (
    <main>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>Now Accepting Members</div>
            <h1 className={styles.heroTitle}>
              Where Black Executives{' '}
              <span style={{ color: '#B59410' }}>Lead and Thrive</span>
            </h1>
            <p className={styles.heroSubtitle}>
              BERG Collective is a premier network of Black executives, entrepreneurs, and
              professionals committed to building community, advancing careers, and creating
              lasting generational impact.
            </p>
            <div className={styles.heroActions}>
              <Button to="/join" variant="primary">Join the Collective</Button>
              <Button to="/programs" variant="outline">View Programs</Button>
            </div>
            <div className={styles.avatarRow}>
              <div className={styles.avatarStack}>
                <img src="/images/photos/rich-headshot-new.jpg" alt="Member" className={styles.avatar} />
                <img src="/images/photos/evol-headshot.jpg" alt="Member" className={styles.avatar} />
                <img src="/images/photos/michelle-amy-sherald-whitney.jpg" alt="Member" className={styles.avatar} />
                <img src="/images/photos/whitney-womens-panel.jpg" alt="Member" className={styles.avatar} />
              </div>
              <p className={styles.avatarLabel}><strong>10,000+</strong> members nationwide</p>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroImageWrap}>
              <img
                src="/images/photos/berg-summer%20mixer.jpg"
                alt="BERG Collective summer mixer"
                className={styles.heroImage}
              />
              <div className={styles.heroGradient} />
              <div className={styles.quoteCard}>
                <p className={styles.quoteText}>
                  "BERG gave me the community I didn't know I needed — and the network that
                  changed my career."
                </p>
                <p className={styles.quoteAttrib}>— Michelle Thompson, Director of Strategy</p>
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
                src="/images/photos/whitney-first-floor.jpg"
                alt="Whitney Museum first floor"
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
              BERG Collective was founded on a simple but radical idea: that Black professionals
              deserve a space built by us, for us. Not a diversity initiative. Not a pipeline
              program. A genuine, peer-to-peer network of excellence where every member belongs
              at the table.
            </p>
            <p className={styles.missionBody}>
              We build that table. And we make it bigger, together.
            </p>
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>4</span>
                <span className={styles.statLabel}>Active Chapters</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>50+</span>
                <span className={styles.statLabel}>Events Annually</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>85%</span>
                <span className={styles.statLabel}>Career Growth</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.values}>
        <div className={styles.valuesInner}>
          <SectionHeader eyebrow="What Drives Us" title="Our Core Values" centered />
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="15" stroke="#B59410" strokeWidth="2" />
                  <path d="M16 8C13.8 8 12 9.8 12 12C12 14.2 13.8 16 16 16C18.2 16 20 14.2 20 12C20 9.8 18.2 8 16 8Z" fill="#B59410" />
                  <path d="M8 24C8 20.7 11.6 18 16 18C20.4 18 24 20.7 24 24" stroke="#B59410" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Community First</h3>
              <p className={styles.valueDesc}>
                Every decision we make starts with this question: how does this serve our members?
                Community is not a buzzword here — it is our operating principle.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="16,4 20,12 28,13 22,19 24,27 16,23 8,27 10,19 4,13 12,12" stroke="#B59410" strokeWidth="2" fill="none" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Excellence Always</h3>
              <p className={styles.valueDesc}>
                We hold ourselves and each other to a high standard — not because perfection is
                the goal, but because Black excellence has always had to prove itself. We embrace
                that legacy and own it proudly.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4L6 10V16C6 21.5 10.5 26.7 16 28C21.5 26.7 26 21.5 26 16V10L16 4Z" stroke="#B59410" strokeWidth="2" fill="none" strokeLinejoin="round" />
                  <path d="M12 16L15 19L21 13" stroke="#B59410" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.valueTitle}>Authentic Impact</h3>
              <p className={styles.valueDesc}>
                We measure impact by what actually changes — careers advanced, deals closed,
                scholarships awarded, communities strengthened. Authenticity means showing up
                with intention and delivering on our promises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter Leaders Section */}
      <section className={styles.leaders}>
        <div className={styles.leadersInner}>
          <SectionHeader eyebrow="Leadership" title="Chapter Leaders" centered />
          <div className={styles.leadersGrid}>
            <div className={styles.leaderCard}>
              <div className={styles.leaderImageWrap}>
                <img
                  src="/images/photos/rich-headshot-new.jpg"
                  alt="Rich Nellhaus"
                  className={styles.leaderImage}
                />
              </div>
              <div className={styles.leaderInfo}>
                <h3 className={styles.leaderName}>Rich Nellhaus</h3>
                <p className={styles.leaderRole}>Co-Founder &amp; New York Chapter Lead</p>
                <p className={styles.leaderDesc}>
                  Rich is a seasoned executive and community builder with over 15 years of
                  experience in technology and organizational strategy. He co-founded BERG
                  Collective with the vision of creating an uncompromising space for Black
                  professionals to thrive.
                </p>
              </div>
            </div>
            <div className={styles.leaderCard}>
              <div className={styles.leaderImageWrap}>
                <img
                  src="/images/photos/evol-headshot.jpg"
                  alt="Evol"
                  className={styles.leaderImage}
                />
              </div>
              <div className={styles.leaderInfo}>
                <h3 className={styles.leaderName}>Evol</h3>
                <p className={styles.leaderRole}>Los Angeles Chapter Lead</p>
                <p className={styles.leaderDesc}>
                  Evol brings a unique blend of creative industry expertise and community
                  organizing to the LA chapter. With deep roots in entertainment and tech,
                  he has grown the LA chapter into one of BERG's most vibrant communities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Join the Movement?</h2>
          <p className={styles.ctaSubtitle}>
            Become part of a community that invests in your growth, amplifies your voice,
            and stands with you every step of the way.
          </p>
          <div className={styles.ctaActions}>
            <Button to="/join" variant="white">Join the Collective</Button>
            <Button to="/programs" variant="outline">Explore Programs</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
