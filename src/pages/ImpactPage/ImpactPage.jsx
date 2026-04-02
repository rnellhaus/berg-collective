import { useState } from 'react';
import styles from './ImpactPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';
import { useFormProtection } from '../../hooks/useFormProtection';

const stats = [
  { number: '12K+', label: 'Professionals Connected' },
  { number: '40+', label: 'ERG Partners' },
  { number: '$50K+', label: 'Invested in Black-Owned Businesses' },
  { number: '5', label: 'Cities Represented' },
];

const partners = [
  'Google', 'Disney', 'NFL', 'Netflix', 'Betterment', 'TikTok',
  'LinkedIn', 'Amazon', 'Meta', 'Microsoft', 'Spotify', 'PepsiCo',
  'Adobe', 'Warner Bros.',
];

const highlights = [
  {
    image: '/images/photos/BERG-7213-scaled.jpg',
    alt: 'BERG Collective summit gathering',
    eyebrow: 'Community Building',
    title: 'Connecting Professionals Across Industries',
    body: 'In 2025, BERG Collective brought together professionals from over 40 corporate ERGs for networking events, panel discussions, and summits that sparked meaningful career connections and cross-company collaboration.',
  },
  {
    image: '/images/photos/whitney-womens-panel.jpg',
    alt: "BERG women's leadership panel at the Whitney Museum",
    eyebrow: 'Leadership Development',
    title: "Elevating ERG Leaders at Every Level",
    body: "From our sold-out Women's Leadership Panel at the Whitney Museum to intimate executive roundtables, BERG programming in 2025 equipped ERG leaders with the skills, visibility, and relationships to lead with greater impact.",
  },
  {
    image: '/images/photos/DSC09056.jpg',
    alt: 'BERG Collective investing in Black-owned businesses',
    eyebrow: 'Economic Impact',
    title: 'Investing in Black-Owned Businesses',
    body: 'BERG Collective directed over $50,000 in spending toward Black-owned vendors, caterers, photographers, and production companies in 2025 — turning every event into an economic opportunity for Black entrepreneurs.',
  },
  {
    image: '/images/photos/i-4fznBWM-X5.jpg',
    alt: 'BERG Collective expanding nationally',
    eyebrow: 'Network Growth',
    title: 'Expanding Our Footprint Nationally',
    body: 'With a presence now spanning 5 cities and growing, BERG Collective is building the infrastructure to support ERGs wherever Black professionals are showing up and leading.',
  },
];

const emptyForm = { name: '', email: '', company: '', title: '', linkedin: '' };

export default function ImpactPage() {
  usePageMeta('Impact', 'See the 2025 impact BERG Collective is making for Black professionals and ERGs.');

  const { honeypotProps, isBot } = useFormProtection();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBot()) {
      setStatus('success');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/forms/impact-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Submission failed. Please try again.');
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.sectionLabel}>2025 IMPACT REPORT</span>
          <h1 className={styles.heroTitle}>Driving Change. Building Legacy.</h1>
          <p className={styles.heroSubtitle}>
            In 2025, BERG Collective deepened its partnerships with ERGs across the country,
            expanded programming in 5 cities, and invested meaningfully in the Black professional
            ecosystem. Here's what we built together.
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsSection}>
        <div className={styles.statsInner}>
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <span className={styles.statNumber}>{stat.number}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Grid */}
      <section className={styles.partnersSection}>
        <div className={styles.partnersInner}>
          <span className={styles.sectionLabel}>OUR PARTNERS</span>
          <div className={styles.partnerGrid}>
            {partners.map((partner) => (
              <div key={partner} className={styles.partnerItem}>
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Highlights */}
      <section className={styles.highlightsSection}>
        <div className={styles.highlightsInner}>
          <span className={styles.sectionLabel}>IMPACT HIGHLIGHTS</span>
          <h2 className={styles.highlightsTitle}>What We Accomplished in 2025</h2>
          <div className={styles.highlightsList}>
            {highlights.map((item, i) => (
              <div
                key={item.title}
                className={`${styles.highlightRow} ${i % 2 !== 0 ? styles.highlightRowReverse : ''}`}
              >
                <div className={styles.highlightImageWrap}>
                  <img
                    src={item.image}
                    alt={item.alt}
                    className={styles.highlightImage}
                    loading="lazy"
                  />
                </div>
                <div className={styles.highlightText}>
                  <span className={styles.highlightEyebrow}>{item.eyebrow}</span>
                  <h3 className={styles.highlightHeading}>{item.title}</h3>
                  <p className={styles.highlightBody}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className={styles.downloadBanner}>
        <div className={styles.downloadInner}>
          <h2 className={styles.downloadTitle}>Download the Full 2025 Impact Report</h2>
          <p className={styles.downloadSub}>
            Get the complete data, stories, and vision for what BERG Collective is building.
          </p>

          {!showForm && (
            <button
              className={styles.downloadBtn}
              onClick={() => setShowForm(true)}
            >
              Download 2025 Impact Report
            </button>
          )}

          {showForm && status !== 'success' && (
            <form className={styles.gateForm} onSubmit={handleSubmit} noValidate>
              <input {...honeypotProps} />
              <p className={styles.gateFormIntro}>
                Fill in your info to access the full report.
              </p>

              <div className={styles.gateFormRow}>
                <div className={styles.gateFieldGroup}>
                  <label htmlFor="gate-name" className={styles.gateLabel}>Full Name <span className={styles.required}>*</span></label>
                  <input
                    id="gate-name"
                    name="name"
                    type="text"
                    className={styles.gateInput}
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.gateFieldGroup}>
                  <label htmlFor="gate-email" className={styles.gateLabel}>Email <span className={styles.required}>*</span></label>
                  <input
                    id="gate-email"
                    name="email"
                    type="email"
                    className={styles.gateInput}
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.gateFormRow}>
                <div className={styles.gateFieldGroup}>
                  <label htmlFor="gate-company" className={styles.gateLabel}>Company</label>
                  <input
                    id="gate-company"
                    name="company"
                    type="text"
                    className={styles.gateInput}
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.gateFieldGroup}>
                  <label htmlFor="gate-title" className={styles.gateLabel}>Title</label>
                  <input
                    id="gate-title"
                    name="title"
                    type="text"
                    className={styles.gateInput}
                    placeholder="VP of People"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.gateFieldGroup}>
                <label htmlFor="gate-linkedin" className={styles.gateLabel}>LinkedIn Profile URL</label>
                <input
                  id="gate-linkedin"
                  name="linkedin"
                  type="url"
                  className={styles.gateInput}
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin}
                  onChange={handleChange}
                />
              </div>

              {status === 'error' && (
                <p className={styles.gateError}>{errorMsg}</p>
              )}

              <button
                type="submit"
                className={styles.gateSubmitBtn}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Submitting…' : 'Get the Report'}
              </button>
            </form>
          )}

          {status === 'success' && (
            <div className={styles.gateSuccess}>
              <p className={styles.gateSuccessMsg}>Thank you! Your report is ready.</p>
              <a
                href="/api/documents/file/berg-collective-2025-impact-report"
                className={styles.downloadBtn}
                download
              >
                Download PDF
              </a>
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
