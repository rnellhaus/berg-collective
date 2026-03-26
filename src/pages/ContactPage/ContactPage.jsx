import { useState } from 'react';
import Button from '../../components/Button/Button';
import styles from './ContactPage.module.css';
import usePageMeta from '../../hooks/usePageMeta';

const subjects = [
  'General Inquiry',
  'Membership Question',
  'Partnership Opportunity',
  'Event Information',
  'Media & Press',
  'Donations & Giving',
  'Other',
];

const socials = [
  { name: 'Instagram', href: 'https://instagram.com', handle: '@bergcollective' },
  { name: 'LinkedIn', href: 'https://linkedin.com', handle: 'BERG Collective' },
  { name: 'Twitter / X', href: 'https://twitter.com', handle: '@bergcollective' },
  { name: 'Facebook', href: 'https://facebook.com', handle: 'BERG Collective' },
];

const chapters = [
  {
    name: 'Rich Nellhaus',
    role: 'Los Angeles Chapter Lead',
    photo: '/images/photos/rich-headshot-new.jpg',
    email: 'rich@bergcollective.org',
  },
  {
    name: 'Evol',
    role: 'New York City Chapter Lead',
    photo: '/images/photos/evol-headshot.jpg',
    email: 'evol@bergcollective.org',
  },
];

export default function ContactPage() {
  usePageMeta('Contact', 'Get in touch with the BERG Collective team.');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission placeholder
    alert('Thank you for reaching out! We will get back to you shortly.');
  };

  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>Get In Touch</span>
          <h1 className={styles.heroTitle}>
            We'd Love to{' '}
            <span className={styles.gold}>Hear</span>{' '}
            From You
          </h1>
          <p className={styles.heroSubtitle}>
            Whether you have questions about membership, want to explore a partnership,
            or just want to connect — our team is here for you.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className={styles.contactOptions}>
        <div className={styles.optionsInner}>
          <div className={styles.optionsGrid}>
            <div className={styles.optionCard}>
              <div className={styles.iconBox} style={{ background: 'linear-gradient(135deg, #8b3223, #b84735)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h3 className={styles.optionTitle}>Email Us</h3>
              <p className={styles.optionValue}>info@bergcollective.org</p>
              <p className={styles.optionNote}>We respond within 24–48 hours</p>
            </div>
            <div className={styles.optionCard}>
              <div className={styles.iconBox} style={{ background: 'linear-gradient(135deg, #B59410, #d4ad1a)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <h3 className={styles.optionTitle}>Call Us</h3>
              <p className={styles.optionValue}>(123) 456-7890</p>
              <p className={styles.optionNote}>Mon–Fri, 9am–5pm PT</p>
            </div>
            <div className={styles.optionCard}>
              <div className={styles.iconBox} style={{ background: 'linear-gradient(135deg, #2f2828, #4a3a3a)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3 className={styles.optionTitle}>Headquarters</h3>
              <p className={styles.optionValue}>Los Angeles, CA</p>
              <p className={styles.optionNote}>Chapters across the US</p>
            </div>
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className={styles.formSection}>
        <div className={styles.formInner}>
          {/* Form */}
          <div className={styles.formArea}>
            <h2 className={styles.formTitle}>Send Us a Message</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
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
                <label htmlFor="subject" className={styles.label}>Subject</label>
                <select
                  id="subject"
                  name="subject"
                  className={styles.select}
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a subject...</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="message" className={styles.label}>Message</label>
                <textarea
                  id="message"
                  name="message"
                  className={styles.textarea}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Send Message
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" />
                </svg>
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Social Links */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Follow Us</h3>
              <div className={styles.socialList}>
                {socials.map((s) => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    <span className={styles.socialName}>{s.name}</span>
                    <span className={styles.socialHandle}>{s.handle}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Chapter Contacts */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Chapter Contacts</h3>
              <div className={styles.chapterList}>
                {chapters.map((c) => (
                  <div key={c.name} className={styles.chapterItem}>
                    <img src={c.photo} alt={c.name} className={styles.chapterPhoto} />
                    <div className={styles.chapterInfo}>
                      <p className={styles.chapterName}>{c.name}</p>
                      <p className={styles.chapterRole}>{c.role}</p>
                      <a href={`mailto:${c.email}`} className={styles.chapterEmail}>{c.email}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Link */}
            <div className={styles.sideCard}>
              <h3 className={styles.sideCardTitle}>Have Questions?</h3>
              <p className={styles.sideCardText}>
                Check our FAQ for quick answers to common questions about membership, events, and more.
              </p>
              <Button to="/faq" variant="outline">View FAQ</Button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
