import { useState } from 'react';
import Button from '../../components/Button/Button';
import styles from './JoinPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const TIERS = [
  {
    id: 'growing',
    name: 'Growing Tier',
    title: 'Growing',
    desc: 'For smaller ERGs or local chapters looking to build momentum and establish their presence.',
    features: [
      '2 ERG Lead seats',
      'Up to 50 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Talent pipeline access',
    ],
    featured: false,
  },
  {
    id: 'established',
    name: 'Established Tier',
    title: 'Established',
    desc: 'For active ERGs seeking consistent engagement, visibility, and cross-industry connection.',
    features: [
      '2 ERG Lead seats',
      'Up to 150 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Monthly ERG leader meetings',
    ],
    featured: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Tier',
    title: 'Enterprise',
    desc: 'For large organizations maximizing recruitment, retention, and brand impact through BERG.',
    features: [
      '2 ERG Lead seats',
      'Up to 250 ERG Member seats',
      'Access to 4 annual flagship events',
      'Members\' directory inclusion',
      'Strategic input on BERG app & programming',
    ],
    featured: false,
  },
];

const steps = [
  { number: '01', title: 'Apply', desc: 'Submit your ERG details' },
  { number: '02', title: 'Interview', desc: 'Meet with our team' },
  { number: '03', title: 'Confirm Tier', desc: 'Select the right fit' },
  { number: '04', title: 'Join', desc: 'Welcome to BERG' },
];

const WIZARD_STEPS = [
  { label: 'Your Info', number: 1 },
  { label: 'About Your ERG', number: 2 },
  { label: 'Final Details', number: 3 },
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
  const [wizardStep, setWizardStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Individual waitlist form
  const [indForm, setIndForm] = useState({ name: '', email: '', linkedin: '', company: '', title: '', reason: '' });
  const [indLoading, setIndLoading] = useState(false);
  const [indStatus, setIndStatus] = useState('idle'); // idle | success | error

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

  async function handleIndividualSubmit(e) {
    e.preventDefault();
    if (!indForm.name || !indForm.email) return;
    setIndLoading(true);
    setIndStatus('idle');
    try {
      const res = await fetch('/api/forms/individual-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(indForm),
      });
      if (!res.ok) throw new Error('Failed');
      setIndStatus('success');
    } catch {
      setIndStatus('error');
    } finally {
      setIndLoading(false);
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

      {/* Tiers — matches homepage MembershipTeaser layout */}
      <section className={styles.tiersSection}>
        <div className={styles.tiersInner}>
          {/* Intro row */}
          <div className={styles.intro}>
            <div>
              <span className={styles.sectionLabel}>CORPORATE MEMBERSHIP</span>
              <h2 className={styles.introHeading}>Your ERG's seat<br />at the table.</h2>
              <p className={styles.introSub}>
                Three corporate membership tiers designed to meet your ERG where
                it is — and take it further. No pricing listed; we believe the
                right fit matters more than the right price.
              </p>
            </div>
            <div className={styles.introCard}>
              <p>
                BERG membership gives your ERG access to{' '}
                <strong>flagship events</strong>, a{' '}
                <strong>talent pipeline</strong>,{' '}
                <strong>leadership development</strong> with 45+ ERG leaders, and
                direct <strong>community impact</strong> opportunities — all built
                around Black professional excellence.
              </p>
            </div>
          </div>

          {/* Tier cards */}
          <div className={styles.tiers}>
            {TIERS.map(({ id, name, title, desc, features, featured, badge }) => (
              <div key={id} className={`${styles.tier} ${featured ? styles.tierFeatured : ''}`}>
                {badge && <span className={styles.tierBadge}>{badge}</span>}
                <span className={styles.tierLabel}>{name}</span>
                <h3 className={styles.tierTitle}>{title}</h3>
                <p className={styles.tierDesc}>{desc}</p>
                <ul className={styles.featureList}>
                  {features.map((f) => (
                    <li key={f} className={styles.featureItem}>
                      <span className={styles.checkDot} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#apply"
                  className={`${styles.tierCta} ${featured ? styles.tierCtaGold : styles.tierCtaDark}`}
                  onClick={(e) => { e.preventDefault(); document.querySelector('#apply')?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  Apply Now
                </a>
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

      {/* Application Form — Multi-Step Wizard */}
      <section className={styles.formSection} id="apply">
        <div className={styles.formInner}>
          <span className={styles.sectionLabel}>APPLY NOW</span>
          <h2 className={styles.formTitle}>Send Your Application</h2>
          <p className={styles.formIntro}>
            The BERG Collective brings together a powerful network of Black Employee Resource
            Groups across industries. Apply below to plug into our dynamic community.
          </p>

          {success ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <h3 className={styles.successTitle}>Application Submitted!</h3>
              <p className={styles.successText}>
                Thank you for your interest in BERG Collective. Our team will review your
                application and be in touch within 5 business days.
              </p>
              <button className={styles.ctaBtnGold} onClick={() => { setSuccess(false); setWizardStep(1); setFields(initialFields); setFile(null); }}>
                Submit Another Application
              </button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className={styles.wizardNav}>
                {WIZARD_STEPS.map((step) => (
                  <div key={step.number} className={`${styles.wizardStep} ${wizardStep === step.number ? styles.wizardStepActive : ''} ${wizardStep > step.number ? styles.wizardStepDone : ''}`}>
                    <div className={styles.wizardDot}>{wizardStep > step.number ? '✓' : step.number}</div>
                    <span className={styles.wizardLabel}>{step.label}</span>
                  </div>
                ))}
                <div className={styles.wizardLine} />
              </div>

              <form className={styles.form} onSubmit={handleSubmit} encType="multipart/form-data">

                {/* Step 1: Contact Info */}
                {wizardStep === 1 && (
                  <div className={styles.wizardPanel}>
                    <h3 className={styles.wizardPanelTitle}>Contact Information</h3>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>First Name *</label>
                        <input name="firstName" type="text" required className={styles.formInput} value={fields.firstName} onChange={handleChange} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Last Name *</label>
                        <input name="lastName" type="text" required className={styles.formInput} value={fields.lastName} onChange={handleChange} />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Title *</label>
                        <input name="title" type="text" required className={styles.formInput} value={fields.title} onChange={handleChange} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Company *</label>
                        <input name="company" type="text" required className={styles.formInput} value={fields.company} onChange={handleChange} />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>ERG Name *</label>
                        <input name="erg" type="text" required className={styles.formInput} value={fields.erg} onChange={handleChange} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Phone Number *</label>
                        <input name="phone" type="tel" required className={styles.formInput} value={fields.phone} onChange={handleChange} />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email *</label>
                      <input name="email" type="email" required className={styles.formInput} value={fields.email} onChange={handleChange} />
                    </div>
                    <div className={styles.wizardActions}>
                      <div />
                      <button type="button" className={styles.ctaBtnGold} onClick={() => {
                        if (!fields.firstName || !fields.lastName || !fields.email || !fields.company || !fields.erg || !fields.phone || !fields.title) {
                          setError('Please fill in all required fields.');
                          return;
                        }
                        setError('');
                        setWizardStep(2);
                      }}>
                        Next: About Your ERG →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: ERG Questions */}
                {wizardStep === 2 && (
                  <div className={styles.wizardPanel}>
                    <h3 className={styles.wizardPanelTitle}>About Your ERG</h3>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Have you been in existence for 2+ years?</label>
                      <textarea name="q1" className={styles.formTextarea} value={fields.q1} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>How does your company embody the Collective ERG Mission Statement?</label>
                      <textarea name="q2" className={styles.formTextarea} value={fields.q2} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>In what ways does your ERG strive to engage the pillars of the Collective?</label>
                      <textarea name="q3" className={styles.formTextarea} value={fields.q3} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Where do you see your company making strides in diversity?</label>
                      <textarea name="q4" className={styles.formTextarea} value={fields.q4} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.wizardActions}>
                      <button type="button" className={styles.ctaBtnOutline} onClick={() => setWizardStep(1)}>
                        ← Back
                      </button>
                      <button type="button" className={styles.ctaBtnGold} onClick={() => setWizardStep(3)}>
                        Next: Final Details →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Final Details + Submit */}
                {wizardStep === 3 && (
                  <div className={styles.wizardPanel}>
                    <h3 className={styles.wizardPanelTitle}>Final Details</h3>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>What would it mean to your ERG to be a part of the Collective?</label>
                      <textarea name="q5" className={styles.formTextarea} value={fields.q5} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>If you were in charge of the next quarterly ERG event, what would it be?</label>
                      <textarea name="q6" className={styles.formTextarea} value={fields.q6} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>What resources are you able to contribute to the Collective?</label>
                      <textarea name="q7" className={styles.formTextarea} value={fields.q7} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Additional Message</label>
                      <textarea name="message" className={styles.formTextarea} value={fields.message} onChange={handleChange} rows={3} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Upload Supporting Documents (optional)</label>
                      <label className={styles.fileLabel}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span>{file ? file.name : 'PDF, DOC, or DOCX (max 10MB)'}</span>
                        <input type="file" accept=".pdf,.doc,.docx" className={styles.fileInput} onChange={handleFile} />
                      </label>
                    </div>

                    {error && <p className={styles.errorMsg}>{error}</p>}

                    <div className={styles.wizardActions}>
                      <button type="button" className={styles.ctaBtnOutline} onClick={() => setWizardStep(2)}>
                        ← Back
                      </button>
                      <button type="submit" className={styles.ctaBtnGold} disabled={loading}>
                        {loading ? 'Submitting…' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </section>

      {/* Individual Membership — Waitlist with Form */}
      <section className={styles.individualSection}>
        <div className={styles.individualInner}>
          <div className={styles.individualGrid}>
            {/* Left: Info */}
            <div className={styles.individualContent}>
              <span className={styles.individualBadge}>COMING 2026</span>
              <h2 className={styles.individualTitle}>Individual Membership</h2>
              <p className={styles.individualBody}>
                We hear you — individual membership is our most requested feature.
                Currently, BERG Collective membership is at the organization level through
                your company's ERG. But that doesn't mean you can't be part of our community.
              </p>
              <div className={styles.individualHighlights}>
                <div className={styles.individualHighlight}>
                  <span className={styles.highlightIcon}>🎟️</span>
                  <div>
                    <strong>Attend Our Events</strong>
                    <p>All BERG events are open to the public. No membership required.</p>
                  </div>
                </div>
                <div className={styles.individualHighlight}>
                  <span className={styles.highlightIcon}>📬</span>
                  <div>
                    <strong>Join Our Newsletter</strong>
                    <p>Stay in the loop on events, opportunities, and community updates.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Waitlist Form */}
            <div className={styles.waitlistCard}>
              {indStatus === 'success' ? (
                <div className={styles.waitlistSuccess}>
                  <div className={styles.waitlistSuccessIcon}>✓</div>
                  <h3 className={styles.waitlistSuccessTitle}>You're on the list!</h3>
                  <p className={styles.waitlistSuccessText}>
                    We'll notify you as soon as individual membership launches. In the meantime, check out our upcoming events.
                  </p>
                  <Button to="/events" variant="gold">Browse Events</Button>
                </div>
              ) : (
                <>
                  <h3 className={styles.waitlistTitle}>Join the Waitlist</h3>
                  <p className={styles.waitlistSubtitle}>Be the first to know when individual membership launches.</p>
                  <form className={styles.waitlistForm} onSubmit={handleIndividualSubmit}>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name *</label>
                        <input
                          type="text"
                          required
                          className={styles.formInput}
                          value={indForm.name}
                          onChange={(e) => setIndForm(p => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email *</label>
                        <input
                          type="email"
                          required
                          className={styles.formInput}
                          value={indForm.email}
                          onChange={(e) => setIndForm(p => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Company</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={indForm.company}
                          onChange={(e) => setIndForm(p => ({ ...p, company: e.target.value }))}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Job Title</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={indForm.title}
                          onChange={(e) => setIndForm(p => ({ ...p, title: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>LinkedIn Profile URL</label>
                      <input
                        type="url"
                        className={styles.formInput}
                        placeholder="https://linkedin.com/in/..."
                        value={indForm.linkedin}
                        onChange={(e) => setIndForm(p => ({ ...p, linkedin: e.target.value }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Why do you want to join BERG?</label>
                      <textarea
                        className={styles.formTextarea}
                        rows={3}
                        value={indForm.reason}
                        onChange={(e) => setIndForm(p => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    {indStatus === 'error' && <p className={styles.errorMsg}>Something went wrong. Please try again.</p>}
                    <button type="submit" className={styles.ctaBtnGold} disabled={indLoading} style={{ width: '100%' }}>
                      {indLoading ? 'Submitting…' : 'Join the Waitlist'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
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
