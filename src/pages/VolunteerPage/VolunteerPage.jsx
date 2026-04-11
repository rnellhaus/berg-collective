import { useState } from 'react';
import Button from '../../components/Button/Button';
import Turnstile from '../../components/Turnstile/Turnstile';
import styles from './VolunteerPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';
import { useFormProtection } from '../../hooks/useFormProtection';

const interests = [
  'Event Setup & Logistics',
  'Photography & Videography',
  'Marketing & Social Media',
  'Mentoring & Coaching',
  'Speaker & Panel Moderator',
  'Community Outreach',
  'Fundraising & Sponsorships',
  'Administrative Support',
  'Other',
];

const availabilityOptions = [
  'Weekdays',
  'Weekends',
  'Both Weekdays & Weekends',
  'Evenings Only',
  'Flexible / As Needed',
];

const whyVolunteer = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Build Your Network',
    desc: 'Connect with professionals across industries who share your commitment to equity and inclusion.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Develop New Skills',
    desc: 'Gain hands-on experience in event management, leadership, marketing, and community building.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Make Real Impact',
    desc: 'Your time directly supports programs that advance diversity, equity, and belonging in the workplace.',
  },
];

export default function VolunteerPage() {
  usePageMeta(
    'Volunteer with BERG Collective',
    'Volunteer with BERG Collective to support events, programs, and community initiatives for Black professionals and ERGs across the US.',
    { path: '/volunteer' }
  );
  const { honeypotProps, isBot } = useFormProtection();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    areaOfInterest: '',
    availability: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [captchaToken, setCaptchaToken] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBot()) {
      setSubmitResult({ success: true, message: 'Thank you for signing up to volunteer! We\'ll be in touch soon.' });
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', areaOfInterest: '', availability: '', message: '' });
      return;
    }
    if (!captchaToken) {
      setSubmitResult({ success: false, message: 'Please complete the captcha before submitting.' });
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/forms/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          area_of_interest: formData.areaOfInterest,
          availability: formData.availability,
          message: formData.message,
          cf_turnstile_token: captchaToken,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitResult({ success: true, message: 'Thank you for signing up to volunteer! We\'ll be in touch soon.' });
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', areaOfInterest: '', availability: '', message: '' });
    } catch {
      setSubmitResult({ success: false, message: 'Something went wrong. Please try again or email us directly.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>Volunteer</p>
          <h1 className={styles.heroTitle}>Lend a Hand</h1>
          <p className={styles.heroSubtitle}>
            Our events and programs are powered by people like you. Whether you have
            a few hours or a few days, your contribution makes a lasting difference.
          </p>
        </div>
      </section>

      {/* Why Volunteer */}
      <section className={styles.whySection}>
        <div className={styles.whyInner}>
          <h2 className={styles.whySectionTitle}>Why Volunteer with BERG</h2>
          <div className={styles.whyGrid}>
            {whyVolunteer.map((item) => (
              <div key={item.title} className={styles.whyCard}>
                <div className={styles.iconBox}>{item.icon}</div>
                <h3 className={styles.whyCardTitle}>{item.title}</h3>
                <p className={styles.whyCardDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className={styles.formSection}>
        <div className={styles.formInner}>
          {/* Form */}
          <div className={styles.formArea}>
            <h2 className={styles.formTitle}>Sign Up to Volunteer</h2>
            <p className={styles.formSubtitle}>
              Fill out the form below and a coordinator will reach out with upcoming opportunities.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <input {...honeypotProps} />
              <div className={styles.nameRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="firstName" className={styles.label}>First Name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    className={styles.input}
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="lastName" className={styles.label}>Last Name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    className={styles.input}
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className={styles.nameRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.label}>Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="phone" className={styles.label}>Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className={styles.input}
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="company" className={styles.label}>Company / Organization <span className={styles.optionalTag}>Optional</span></label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  className={styles.input}
                  placeholder="Where you work or volunteer"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.nameRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="areaOfInterest" className={styles.label}>Area of Interest</label>
                  <select
                    id="areaOfInterest"
                    name="areaOfInterest"
                    className={styles.select}
                    value={formData.areaOfInterest}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select an area...</option>
                    {interests.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="availability" className={styles.label}>Availability</label>
                  <select
                    id="availability"
                    name="availability"
                    className={styles.select}
                    value={formData.availability}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select availability...</option>
                    {availabilityOptions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="message" className={styles.label}>Tell Us About Yourself <span className={styles.optionalTag}>Optional</span></label>
                <textarea
                  id="message"
                  name="message"
                  className={styles.textarea}
                  placeholder="Share any relevant experience, skills, or what excites you about volunteering with BERG..."
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>
              <Turnstile onVerify={setCaptchaToken} />
              {submitResult && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: submitResult.success ? '#f0fdf4' : '#fef3f2',
                    color: submitResult.success ? '#166534' : '#991b1b',
                    border: `1px solid ${submitResult.success ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {submitResult.message}
                </div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Sign Up to Volunteer'}
                {!submitting && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                  </svg>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Quick Info */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>What to Expect</h3>
              <ul className={styles.expectList}>
                <li>We match your skills and availability to upcoming events</li>
                <li>No minimum time commitment required</li>
                <li>All volunteers receive event access</li>
              </ul>
            </div>

            {/* CTA */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Want to Do More?</h3>
              <p className={styles.sideCardText}>
                If your organization wants to partner with BERG on events and programs, explore our partnership opportunities.
              </p>
              <Button to="/partnerships" variant="outline">Explore Partnerships</Button>
            </div>
          </aside>
        </div>
      </section>

      {/* Gold CTA Callout */}
      <section className={styles.goldCta}>
        <div className={styles.goldCtaInner}>
          <h2 className={styles.goldCtaTitle}>Every Hand Makes a Difference</h2>
          <p className={styles.goldCtaSubtitle}>
            Join a community of changemakers who show up, lend their talents, and help build something meaningful.
          </p>
          <Button to="/events" variant="primary">See Upcoming Events</Button>
        </div>
      </section>
    </main>
  );
}
