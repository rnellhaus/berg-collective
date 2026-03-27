import { useState } from 'react';
import Button from '../../components/Button/Button';
import styles from './JoinPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const tiers = [
  {
    id: 'growing',
    name: 'Growing',
    tagline: 'For emerging ERGs',
    highlighted: false,
    features: [
      'Community access',
      'Resource library',
      'Quarterly events',
      'BERG network directory',
    ],
    cta: 'Apply Now',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
  {
    id: 'established',
    name: 'Established',
    tagline: 'For active ERGs with 50+ members',
    highlighted: true,
    features: [
      'Everything in Growing',
      'Dedicated chapter support',
      'Annual summit access',
      'Mentorship matching',
      'Priority event access',
    ],
    cta: 'Apply Now',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For Fortune 500 ERGs',
    highlighted: false,
    features: [
      'Everything in Established',
      'Custom programming',
      'Executive roundtables',
      'Board placement pipeline',
      'White-glove onboarding',
    ],
    cta: 'Contact Us',
    ctaHref: 'mailto:rich@bergcollective.org',
  },
];

const steps = [
  { number: '01', title: 'Apply', desc: 'Submit your ERG details' },
  { number: '02', title: 'Interview', desc: 'Meet with our team' },
  { number: '03', title: 'Confirm Tier', desc: 'Select the right fit' },
  { number: '04', title: 'Join', desc: 'Welcome to BERG' },
];

const initialFields = {
  firstName: '',
  lastName: '',
  title: '',
  company: '',
  erg: '',
  phone: '',
  email: '',
  q1: '',
  q2: '',
  q3: '',
  q4: '',
  q5: '',
  q6: '',
  q7: '',
  message: '',
};

export default function JoinPage() {
  usePageMeta('Membership', 'ERG membership built for impact. Join the BERG Collective.');

  const [fields, setFields] = useState(initialFields);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleFile(e) {
    setFile(e.target.files[0] || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData();
      Object.entries(fields).forEach(([key, val]) => formData.append(key, val));
      if (file) formData.append('file', file);

      const res = await fetch('/api/forms/membership', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Submission failed. Please try again.');

      setSuccess(true);
      setFields(initialFields);
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.sectionLabel}>MEMBERSHIP</span>
          <h1 className={styles.heroTitle}>Built for ERGs. Designed for Impact.</h1>
          <p className={styles.heroSubtitle}>
            BERG Collective membership gives your ERG the structure, support, and community
            to drive real change inside your organization and beyond.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className={styles.tiersSection}>
        <div className={styles.tiersInner}>
          <div className={styles.tiersGrid}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`${styles.tierCard} ${tier.highlighted ? styles.tierHighlighted : ''}`}
              >
                {tier.highlighted && (
                  <span className={styles.tierBadge}>Most Popular</span>
                )}
                <div className={styles.tierHeader}>
                  <h3 className={styles.tierName}>{tier.name}</h3>
                  <p className={styles.tierTagline}>{tier.tagline}</p>
                </div>
                <ul className={styles.featureList}>
                  {tier.features.map((feature) => (
                    <li key={feature} className={styles.featureItem}>
                      <svg
                        className={styles.checkIcon}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17L4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className={styles.tierCta}>
                  <a
                    href={tier.ctaHref}
                    className={`${styles.ctaBtn} ${tier.highlighted ? styles.ctaBtnGold : styles.ctaBtnOutline}`}
                  >
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howSection}>
        <div className={styles.howInner}>
          <span className={styles.sectionLabel}>THE PROCESS</span>
          <h2 className={styles.howTitle}>How It Works</h2>
          <div className={styles.stepsRow}>
            {steps.map((step, i) => (
              <div key={step.number} className={styles.stepWrapper}>
                <div className={styles.stepItem}>
                  <div className={styles.stepCircle}>{step.number}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className={styles.stepConnector} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className={styles.formSection}>
        <div className={styles.formInner}>
          <span className={styles.sectionLabel}>APPLY NOW</span>
          <h2 className={styles.formTitle}>Send Your Application</h2>
          <p className={styles.formIntro}>
            The BERG Collective brings together a powerful network of Black Employee Resource
            Groups across industries to amplify culture, create shared experiences, and drive
            collective impact. If your company is looking to plug into a dynamic community of
            Black professionals and industry leaders, please apply below.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} encType="multipart/form-data">

            {/* Row: First + Last Name */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="firstName">First Name <span aria-hidden="true">*</span></label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className={styles.formInput}
                  value={fields.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="lastName">Last Name <span aria-hidden="true">*</span></label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className={styles.formInput}
                  value={fields.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Row: Title + Company */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="title">Title <span aria-hidden="true">*</span></label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  className={styles.formInput}
                  value={fields.title}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="company">Company <span aria-hidden="true">*</span></label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  className={styles.formInput}
                  value={fields.company}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Row: ERG + Phone */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="erg">ERG <span aria-hidden="true">*</span></label>
                <input
                  id="erg"
                  name="erg"
                  type="text"
                  required
                  className={styles.formInput}
                  value={fields.erg}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="phone">Phone Number <span aria-hidden="true">*</span></label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={styles.formInput}
                  value={fields.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="email">Email <span aria-hidden="true">*</span></label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.formInput}
                value={fields.email}
                onChange={handleChange}
              />
            </div>

            {/* Question divider */}
            <div className={styles.questionsDivider}>
              <span>Please answer the questions below</span>
            </div>

            {/* Textareas */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q1">Have you been in existence for 2+ years?</label>
              <textarea
                id="q1"
                name="q1"
                className={styles.formTextarea}
                value={fields.q1}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q2">How does your company embody the Collective ERG Mission Statement?</label>
              <textarea
                id="q2"
                name="q2"
                className={styles.formTextarea}
                value={fields.q2}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q3">In what ways does your ERG strive to engage the pillars of the Collective?</label>
              <textarea
                id="q3"
                name="q3"
                className={styles.formTextarea}
                value={fields.q3}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q4">Where do you see your company making strides in diversity over the next few years?</label>
              <textarea
                id="q4"
                name="q4"
                className={styles.formTextarea}
                value={fields.q4}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q5">What would it mean to your ERG to be a part of the Collective?</label>
              <textarea
                id="q5"
                name="q5"
                className={styles.formTextarea}
                value={fields.q5}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q6">If you were in charge of the next quarterly ERG event, what would it be? Please describe in detail.</label>
              <textarea
                id="q6"
                name="q6"
                className={styles.formTextarea}
                value={fields.q6}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="q7">What resources are you able to contribute to the Collective?</label>
              <textarea
                id="q7"
                name="q7"
                className={styles.formTextarea}
                value={fields.q7}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="message">Your Message</label>
              <textarea
                id="message"
                name="message"
                className={styles.formTextarea}
                value={fields.message}
                onChange={handleChange}
              />
            </div>

            {/* File Upload */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="applicationFile">Upload Your Application</label>
              <label className={styles.fileLabel} htmlFor="applicationFile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{file ? file.name : 'Choose file — PDF, DOC, or DOCX (max 10MB)'}</span>
                <input
                  id="applicationFile"
                  name="applicationFile"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className={styles.fileInput}
                  onChange={handleFile}
                />
              </label>
            </div>

            {/* Feedback messages */}
            {success && (
              <p className={styles.successMsg}>
                Your application has been submitted! We'll be in touch soon.
              </p>
            )}
            {error && (
              <p className={styles.errorMsg}>{error}</p>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>

          </form>
        </div>
      </section>

      {/* Individual Membership Callout */}
      <section className={styles.callout}>
        <div className={styles.calloutInner}>
          <h2 className={styles.calloutTitle}>Individual Membership Coming in 2026</h2>
          <p className={styles.calloutSub}>Join our waitlist to be the first to know.</p>
          <a href="mailto:rich@bergcollective.org" className={styles.calloutBtn}>
            Join Waitlist
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to Elevate Your ERG?</h2>
          <a href="mailto:rich@bergcollective.org" className={styles.ctaGoldBtn}>
            Apply for ERG Membership
          </a>
        </div>
      </section>

    </main>
  );
}
