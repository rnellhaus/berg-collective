import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const TYPE_LABELS = {
  membership: 'Membership Application',
  individual_waitlist: 'Individual Membership Waitlist',
  impact_download: 'Impact Report Download',
  newsletter: 'Newsletter Signup',
  contact: 'Contact Form',
  volunteer: 'Volunteer Signup',
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
  const { apiFetch } = useApi();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);

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

  if (loading) {
    return <p style={{ color: '#8e5f57', fontStyle: 'italic' }}>Loading submission…</p>;
  }

  if (error) {
    return (
      <div>
        <Link to="/admin/forms" style={{ color: '#8b3223', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
          ← Back to Submissions
        </Link>
        <p style={{ color: '#8b3223', marginTop: '16px' }}>Error: {error}</p>
      </div>
    );
  }

  if (!submission) return null;

  const data = submission.data || {};
  const dataEntries = Object.entries(data).filter(([, v]) => v != null && v !== '');

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Back link */}
      <Link
        to="/admin/forms"
        style={{ color: '#8b3223', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}
      >
        ← Back to Submissions
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#191110', margin: 0 }}>
          {TYPE_LABELS[submission.form_type] || submission.form_type}
        </h1>
        <button
          onClick={handleToggleReview}
          disabled={toggling}
          style={{
            padding: '8px 18px',
            border: 'none',
            borderRadius: '7px',
            background: submission.reviewed ? '#e8e1da' : '#8b3223',
            color: submission.reviewed ? '#6b5752' : '#ffffff',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {toggling ? '...' : submission.reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
        </button>
      </div>

      {/* Meta info */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#6b5752', marginBottom: '24px' }}>
        <span>Submitted {formatDate(submission.created_at)}</span>
        {submission.reviewed ? (
          <span style={{ color: '#166534' }}>
            Reviewed {submission.reviewed_at ? formatDate(submission.reviewed_at) : ''}
          </span>
        ) : (
          <span style={{ color: '#D4AF37', fontWeight: '600' }}>Needs Review</span>
        )}
        {submission.email_sent ? (
          <span style={{ color: '#166534' }}>Email sent</span>
        ) : (
          <span style={{ color: '#991b1b' }}>Email not sent</span>
        )}
      </div>

      {/* Data table */}
      <div style={{ background: '#ffffff', border: '1px solid #e3dbd8', borderRadius: '8px', overflow: 'hidden' }}>
        {dataEntries.map(([key, value], i) => (
          <div
            key={key}
            style={{
              display: 'flex',
              borderBottom: i === dataEntries.length - 1 ? 'none' : '1px solid #f0ebe7',
              padding: '12px 16px',
              gap: '12px',
            }}
          >
            <div style={{ width: '200px', flexShrink: 0, fontSize: '0.82rem', fontWeight: '600', color: '#6b5752' }}>
              {FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div style={{ flex: 1, fontSize: '0.9rem', color: '#191110', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {key === 'email' ? (
                <a href={`mailto:${value}`} style={{ color: '#8b3223', textDecoration: 'none' }}>{value}</a>
              ) : key === 'linkedin' && value ? (
                <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#8b3223', textDecoration: 'none' }}>{value}</a>
              ) : (
                String(value)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* File attachment */}
      {submission.file_path && (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f5f1ee', borderRadius: '8px', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: '600', color: '#6b5752' }}>Attachment: </span>
          <span style={{ color: '#191110' }}>{submission.file_path.split('/').pop()}</span>
        </div>
      )}
    </div>
  );
}
