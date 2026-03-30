import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const FORM_TYPES = [
  { value: '', label: 'All Forms' },
  { value: 'membership', label: 'Membership' },
  { value: 'individual_waitlist', label: 'Waitlist' },
  { value: 'impact_download', label: 'Impact Download' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'contact', label: 'Contact' },
  { value: 'volunteer', label: 'Volunteer' },
];

const TYPE_COLORS = {
  membership: { bg: '#F5EFDB', color: '#6b4c10' },
  individual_waitlist: { bg: '#e8f0fe', color: '#1a56db' },
  impact_download: { bg: '#f0fdf4', color: '#166534' },
  newsletter: { bg: '#fef3f2', color: '#991b1b' },
  contact: { bg: '#f5f1ee', color: '#8e5f57' },
  volunteer: { bg: '#fef9e7', color: '#8b6914' },
};

const TYPE_LABELS = {
  membership: 'Membership',
  individual_waitlist: 'Waitlist',
  impact_download: 'Impact Download',
  newsletter: 'Newsletter',
  contact: 'Contact',
  volunteer: 'Volunteer',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSubmitterInfo(submission) {
  const data = submission.data || {};
  const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || '—';
  const email = data.email || '—';
  return { name, email };
}

export default function FormSubmissionsPage() {
  const { apiFetch } = useApi();
  const [submissions, setSubmissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [reviewedFilter, setReviewedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (typeFilter) params.set('type', typeFilter);
      if (reviewedFilter) params.set('reviewed', reviewedFilter);

      const res = await apiFetch(`/api/forms/submissions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmissions(data.submissions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, typeFilter, reviewedFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  async function handleToggleReview(id) {
    setTogglingId(id);
    try {
      const res = await apiFetch(`/api/forms/submissions/${id}/review`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSubmissions(prev =>
        prev.map(s => (s.id === id ? { ...s, reviewed: updated.reviewed, reviewed_at: updated.reviewed_at } : s))
      );
    } catch (err) {
      setError('Failed to update: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  }

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#191110', margin: 0 }}>
          Form Submissions
        </h1>
        <div style={{ fontSize: '0.8rem', color: '#6b5752' }}>
          {pagination.total} total submission{pagination.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={typeFilter}
          onChange={handleFilterChange(setTypeFilter)}
          style={{
            padding: '7px 12px',
            border: '1px solid #e3dbd8',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#191110',
            background: '#fff',
          }}
        >
          {FORM_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={reviewedFilter}
          onChange={handleFilterChange(setReviewedFilter)}
          style={{
            padding: '7px 12px',
            border: '1px solid #e3dbd8',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#191110',
            background: '#fff',
          }}
        >
          <option value="">All Status</option>
          <option value="0">Needs Review</option>
          <option value="1">Reviewed</option>
        </select>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p style={{ color: '#8e5f57', fontStyle: 'italic', marginTop: '24px' }}>Loading submissions…</p>
      )}
      {error && (
        <p style={{ color: '#8b3223', marginTop: '24px' }}>Error: {error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <p style={{ color: '#8e5f57', fontStyle: 'italic', marginTop: '24px' }}>
          No submissions found.
        </p>
      )}

      {/* Table */}
      {!loading && !error && submissions.length > 0 && (
        <div style={{ border: '1px solid #e8e1da', borderRadius: '8px', overflow: 'hidden' }}>
          {submissions.map((sub, i) => {
            const { name, email } = getSubmitterInfo(sub);
            const typeStyle = TYPE_COLORS[sub.form_type] || { bg: '#f5f1ee', color: '#8e5f57' };
            return (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderBottom: i === submissions.length - 1 ? 'none' : '1px solid #e8e1da',
                  background: sub.reviewed ? '#ffffff' : '#fffbf5',
                  flexWrap: 'wrap',
                }}
              >
                {/* Review indicator */}
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: sub.reviewed ? '#d1d5db' : '#D4AF37',
                    flexShrink: 0,
                  }}
                  title={sub.reviewed ? 'Reviewed' : 'Needs review'}
                />

                {/* Type badge */}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    background: typeStyle.bg,
                    color: typeStyle.color,
                    minWidth: '70px',
                    textAlign: 'center',
                  }}
                >
                  {TYPE_LABELS[sub.form_type] || sub.form_type}
                </span>

                {/* Name & email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#191110', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8e5f57', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {email}
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: '0.78rem', color: '#9c8a86', whiteSpace: 'nowrap' }}>
                  {formatDate(sub.created_at)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => handleToggleReview(sub.id)}
                    disabled={togglingId === sub.id}
                    style={{
                      padding: '4px 10px',
                      border: `1px solid ${sub.reviewed ? '#d1d5db' : '#D4AF37'}`,
                      borderRadius: '6px',
                      background: sub.reviewed ? '#fff' : '#fffbf5',
                      color: sub.reviewed ? '#6b5752' : '#8b6914',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {togglingId === sub.id ? '...' : sub.reviewed ? 'Undo Review' : 'Mark Reviewed'}
                  </button>
                  <Link
                    to={`/admin/forms/${sub.id}`}
                    style={{
                      color: '#8b3223',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: '6px 14px',
              border: '1px solid #e3dbd8',
              borderRadius: '6px',
              background: '#fff',
              color: page <= 1 ? '#d1d5db' : '#8b3223',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: '#6b5752' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            style={{
              padding: '6px 14px',
              border: '1px solid #e3dbd8',
              borderRadius: '6px',
              background: '#fff',
              color: page >= pagination.totalPages ? '#d1d5db' : '#8b3223',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: page >= pagination.totalPages ? 'default' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
