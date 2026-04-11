import { useState } from 'react';
import Turnstile from '../../components/Turnstile/Turnstile';
import styles from './PartnershipsPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';
import { useFormProtection } from '../../hooks/useFormProtection';

const PARTNERSHIPS = [
  {
    image: '/images/photos/whitney-art-activation.jpg',
    alt: 'BERG Collective event at the Whitney Museum of American Art',
    title: 'Whitney Museum of American Art',
    subtitle: 'Art, Culture & Community Activation',
    description:
      'Our flagship cultural partnership. BERG Collective and the Whitney Museum have co-produced exclusive after-hours events, artist talks, and community activations — including our celebrated Amy Sherald exhibit experience that brought together 500+ Black professionals for a night of art, networking, and culture.',
    highlights: ['After-Hours Events', 'Artist Talks', 'Private Viewings', '500+ Attendees'],
  },
  {
    image: '/images/photos/20251020_MOCA_Mons_C1_101.jpg',
    alt: 'BERG Collective members at MOCA Los Angeles',
    title: 'Museum of Contemporary Art (MOCA)',
    subtitle: 'First Fridays & Creative Programming',
    description:
      "BERG's Los Angeles chapter partners with MOCA for First Friday activations, connecting Black creatives and professionals through art-centered programming. These events have become a cornerstone of LA's Black professional scene, blending creativity with meaningful connection.",
    highlights: ['First Fridays', 'Creative Workshops', 'LA Chapter', 'Monthly Events'],
    imagePosition: 'top',
  },
  {
    image: '/images/photos/NBAF_AfroTech_Day3-2-172-2.jpg',
    alt: 'BERG Collective NBA Foundation partnership event',
    title: 'NBA Foundation',
    subtitle: 'Economic Empowerment & Youth Development',
    description:
      'Through our partnership with the NBA Foundation, BERG Collective has expanded programming focused on economic empowerment, career development, and youth mentorship. This partnership strengthens our mission to create generational impact in Black communities.',
    highlights: ['Career Development', 'Youth Mentorship', 'Economic Impact', 'National Reach'],
  },
];

const GALLERY_PHOTOS = [
  { src: '/images/photos/amy-sherald-exhibit.jpg',          alt: 'Amy Sherald exhibit at the Whitney' },
  { src: '/images/photos/berg members-whitney.jpg',          alt: 'BERG members at the Whitney Museum' },
  { src: '/images/photos/lobby-whitney-people-dancing.jpg',  alt: 'Guests dancing in the Whitney lobby' },
  { src: '/images/photos/outdoor-whitney-muesuem.jpg',       alt: 'Outdoor event at the Whitney Museum' },
  { src: '/images/photos/amysherald-whitney-photo.jpg',      alt: 'Amy Sherald Whitney photo' },
  { src: '/images/photos/GHMP3820.jpg',                      alt: 'BERG Collective in action' },
  { src: '/images/photos/BERG-1719.jpg',                     alt: 'BERG Collective event' },
  { src: '/images/photos/NBAF_AfroTech_Day2-253-2.jpg',     alt: 'BERG at NBA Foundation AfroTech' },
  { src: '/images/photos/Berg_Collective_7th_Annual_Toy_Drive_Holiday_Mixer-1026.jpg', alt: 'BERG 7th Annual Toy Drive & Holiday Mixer' },
];

const WHAT_WE_OFFER = [
  'Access to 12K+ Black professionals',
  'Event production & programming',
  'Brand visibility across our network',
  'Curated audience engagement',
  'Content creation & social amplification',
];

const PARTNERSHIP_TYPES = [
  'Cultural Event',
  'Sponsorship',
  'Community Program',
  'Speaking Engagement',
  'Other',
];

export default function PartnershipsPage() {
  usePageMeta(
    'Corporate Partnerships for Black ERGs',
    'Partner with BERG Collective to support Black Employee Resource Groups through sponsorships, speaking engagements, and community programs.',
    { path: '/partnerships' }
  );
  const { honeypotProps, isBot } = useFormProtection();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    organization: '',
    partnershipType: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [captchaToken, setCaptchaToken] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBot()) {
      setStatus('success');
      setForm({ first_name: '', last_name: '', email: '', organization: '', partnershipType: '', message: '' });
      return;
    }
    if (!captchaToken) {
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          subject: `Partnership Inquiry: ${form.organization}`,
          message: `Partnership Type: ${form.partnershipType}\nOrganization: ${form.organization}\n\n${form.message}`,
          cf_turnstile_token: captchaToken,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
      setForm({ first_name: '', last_name: '', email: '', organization: '', partnershipType: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>STRATEGIC PARTNERSHIPS</span>
          <h1 className={styles.heroHeading}>Building Impact Together</h1>
          <p className={styles.heroSubtitle}>
            BERG Collective partners with world-class institutions to create transformative
            experiences for Black professionals. From museums to major foundations, our partnerships
            amplify culture, drive economic impact, and open doors.
          </p>
        </div>
      </section>

      {/* ── Section 2: Stats bar ── */}
      <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>3+</span>
            <span className={styles.statLabel}>Institutional Partners</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <span className={styles.statNumber}>$50K+</span>
            <span className={styles.statLabel}>Co-Invested</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <span className={styles.statNumber}>10K+</span>
            <span className={styles.statLabel}>Attendees Reached</span>
          </div>
        </div>
      </section>

      {/* ── Section 3: Featured Partnerships ── */}
      <section className={styles.featured}>
        <div className={styles.featuredInner}>
          <span className={styles.label}>OUR PARTNERS</span>
          <h2 className={styles.sectionHeading}>Partnerships That Move Culture</h2>

          <div className={styles.partnerList}>
            {PARTNERSHIPS.map((p) => (
              <article key={p.title} className={styles.partnerCard}>
                <div className={styles.partnerImage}>
                  <img src={p.image} alt={p.alt} style={p.imagePosition ? { objectPosition: p.imagePosition } : undefined} />
                </div>
                <div className={styles.partnerContent}>
                  <p className={styles.partnerSubtitle}>{p.subtitle}</p>
                  <h3 className={styles.partnerTitle}>{p.title}</h3>
                  <p className={styles.partnerDesc}>{p.description}</p>
                  <ul className={styles.highlights}>
                    {p.highlights.map((h) => (
                      <li key={h} className={styles.highlightPill}>{h}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Photo grid ── */}
      <section className={styles.gallery}>
        <div className={styles.galleryInner}>
          <span className={styles.label}>PARTNERSHIP MOMENTS</span>
          <h2 className={styles.sectionHeading}>In Action</h2>
          <div className={styles.galleryGrid}>
            {GALLERY_PHOTOS.map((photo) => (
              <div key={photo.src} className={styles.galleryItem}>
                <img src={photo.src} alt={photo.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Partnership Inquiry Form ── */}
      <section className={styles.inquirySection}>
        <div className={styles.inquiryInner}>
          <div className={styles.inquiryHeader}>
            <span className={styles.label}>WORK WITH US</span>
            <h2 className={styles.sectionHeading}>Interested in Partnering?</h2>
            <p className={styles.inquirySubtitle}>
              We're always looking for mission-aligned institutions and organizations to co-create
              meaningful experiences. Tell us about yourself and how we might work together.
            </p>
          </div>

          <div className={styles.inquiryBody}>
            {/* Left: Form */}
            <div className={styles.formWrap}>
              {status === 'success' ? (
                <div className={styles.successMsg}>
                  <p>Thank you! Your inquiry has been received. We'll be in touch soon.</p>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <input {...honeypotProps} />
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="first_name" className={styles.formLabel}>First Name</label>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        className={styles.formInput}
                        value={form.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="last_name" className={styles.formLabel}>Last Name</label>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        className={styles.formInput}
                        value={form.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.formLabel}>Email <span aria-hidden="true">*</span></label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={styles.formInput}
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="organization" className={styles.formLabel}>Organization / Institution</label>
                    <input
                      id="organization"
                      name="organization"
                      type="text"
                      className={styles.formInput}
                      value={form.organization}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="partnershipType" className={styles.formLabel}>Partnership Type</label>
                    <select
                      id="partnershipType"
                      name="partnershipType"
                      className={styles.formSelect}
                      value={form.partnershipType}
                      onChange={handleChange}
                    >
                      <option value="">Select a type…</option>
                      {PARTNERSHIP_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="message" className={styles.formLabel}>Message</label>
                    <textarea
                      id="message"
                      name="message"
                      className={styles.formTextarea}
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                    />
                  </div>

                  <Turnstile onVerify={setCaptchaToken} />

                  {status === 'error' && (
                    <p className={styles.errorMsg}>Something went wrong. Please complete the captcha and try again.</p>
                  )}

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={status === 'submitting'}
                  >
                    {status === 'submitting' ? 'Sending…' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>

            {/* Right: What we offer */}
            <div className={styles.offerWrap}>
              <h3 className={styles.offerHeading}>What We Offer Partners</h3>
              <ul className={styles.offerList}>
                {WHAT_WE_OFFER.map((item) => (
                  <li key={item} className={styles.offerItem}>
                    <span className={styles.checkmark} aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className={styles.contactInfo}>
                <h4 className={styles.contactHeading}>Connect With Us</h4>
                <a href="https://www.linkedin.com/company/berg-collective2" target="_blank" rel="noopener noreferrer" className={styles.contactEmail}>
                  LinkedIn →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: CTA ── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaHeading}>Let's Create Something Extraordinary</h2>
          <p className={styles.ctaSubtitle}>
            Ready to partner with a community that's redefining what's possible for Black
            professionals? Let's build something meaningful together.
          </p>
          <a href="/contact" className={styles.ctaBtn}>
            Get In Touch
          </a>
        </div>
      </section>
    </>
  );
}
