import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './FormSubmissionDetailPage.module.css';

const TYPE_LABELS = {
  membership: 'Membership Application',
  individual_waitlist: 'Individual Membership Waitlist',
  impact_download: 'Impact Report Download',
  newsletter: 'Newsletter Signup',
  contact: 'Contact Form',
  volunteer: 'Volunteer Signup',
  aisummit_openai: 'AI Summit — OpenAI ChatGPT Plus Claim',
  aisummit_survey: 'AI Summit 2026 — Pulse Survey',
};

const FIELD_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
  title: 'Job Title',
  erg: 'ERG',
  linkedin: 'LinkedIn',
  reason: 'Reason for Joining',
  subject: 'Subject',
  message: 'Message',
  existence_2_years: 'In existence 2+ years?',
  mission_statement: 'How does your company embody the Collective ERG Mission?',
  pillars_engagement: 'How does your ERG engage the pillars?',
  diversity_strides: 'Diversity strides in next few years?',
  part_of_collective: 'What would it mean to be part of the Collective?',
  event_idea: 'Next quarterly ERG event idea?',
  resources: 'Resources to contribute?',
  application_file: 'Application File',
  area_of_interest: 'Area of Interest',
  availability: 'Availability',
  has_openai_account: 'Has OpenAI account?',
  consent_share_openai: 'Consented to share email with OpenAI?',
  rating_overall: 'Overall rating (1–5)',
  nps: 'Likelihood to recommend (0–10)',
  session_thrive_knicks: 'Session: How to Thrive like "Knicks in Five"',
  session_death_of_app: 'Session: The Death of the App and the Rise of Agents',
  session_ai_on_the_go: 'Session: AI on the Go',
  session_ai_native_company: 'Session: Building an AI-Native Company',
  session_partnership_brain: 'Session: Build an AI Partnership Brain in 10 Minutes',
  session_differentiation: 'Session: The Art of Differentiation',
  session_speed_of_thought: 'Session: Speed of Thought',
  most_valuable: 'Most valuable about the programming?',
  general_feedback: 'General feedback',
  next_summit: 'Change or add for the next summit?',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FormSubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/forms/submissions/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSubmission(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch, id]);

  async function handleToggleReview() {
    setToggling(true);
    try {
      const res = await apiFetch(`/api/forms/submissions/${id}/review`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSubmission(prev => ({ ...prev, reviewed: updated.reviewed, reviewed_at: updated.reviewed_at }));
    } catch (err) {
      setError('Failed to update: ' + err.message);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/forms/submissions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('/admin/forms');
    } catch (err) {
      setError('Failed to delete: ' + err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateMsg}>Loading submission…</p>;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Link to="/admin/forms" className={styles.backLink}>
          <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          Back to Submissions
        </Link>
        <p className={styles.errorMsg}>Error: {error}</p>
      </div>
    );
  }

  if (!submission) return null;

  const data = submission.data || {};
  const dataEntries = Object.entries(data).filter(([, v]) => v != null && v !== '');

  return (
    <div className={styles.page}>
      {/* Back link */}
      <Link to="/admin/forms" className={styles.backLink}>
        <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        Back to Submissions
      </Link>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {TYPE_LABELS[submission.form_type] || submission.form_type}
        </h1>
        <div className={styles.headerActions}>
          <button
            onClick={handleToggleReview}
            disabled={toggling}
            className={submission.reviewed ? styles.secondaryBtn : styles.primaryBtn}
          >
            {toggling ? '...' : submission.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={styles.dangerBtn}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      {/* Meta info */}
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
          Submitted {formatDate(submission.created_at)}
        </span>
        {submission.reviewed ? (
          <span className={`${styles.pill} ${styles.pillGreen}`}>
            Reviewed {submission.reviewed_at ? formatDate(submission.reviewed_at) : ''}
          </span>
        ) : (
          <span className={`${styles.pill} ${styles.pillWarm}`}>Needs Review</span>
        )}
        {submission.email_sent ? (
          <span className={`${styles.pill} ${styles.pillGreen}`}>Email sent</span>
        ) : (
          <span className={`${styles.pill} ${styles.pillBrick}`}>Email not sent</span>
        )}
      </div>

      {/* Submitted fields */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Submitted Fields</h2>
        <div className={styles.card}>
          <dl className={styles.fieldList}>
            {dataEntries.map(([key, value]) => (
              <div key={key} className={styles.fieldRow}>
                <dt className={styles.fieldLabel}>
                  {FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </dt>
                <dd className={styles.fieldValue}>
                  {key === 'email' ? (
                    <a href={`mailto:${value}`} className={styles.valueLink}>{value}</a>
                  ) : key === 'linkedin' && value ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className={styles.valueLink}>{value}</a>
                  ) : (
                    String(value)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* File attachment */}
      {submission.file_path && (
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Attachment</h2>
          <div className={styles.attachmentCard}>
            <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
            <span className={styles.attachmentName}>{submission.file_path.split('/').pop()}</span>
          </div>
        </section>
      )}
    </div>
  );
}
