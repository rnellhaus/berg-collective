import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './FormSubmissionsPage.module.css';

const FORM_TYPES = [
  { value: '', label: 'All Forms' },
  { value: 'membership', label: 'Membership' },
  { value: 'individual_waitlist', label: 'Waitlist' },
  { value: 'impact_download', label: 'Impact Download' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'contact', label: 'Contact' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'aisummit_openai', label: 'AI Summit — OpenAI Claim' },
  { value: 'aisummit_survey', label: 'AI Summit — Survey' },
];

const TYPE_PILL_CLASS = {
  membership: 'pillWarm',
  individual_waitlist: 'pillBrick',
  impact_download: 'pillGreen',
  newsletter: 'pillNeutral',
  contact: 'pillNeutral',
  volunteer: 'pillWarm',
  aisummit_openai: 'pillBrick',
  aisummit_survey: 'pillGreen',
};

const TYPE_LABELS = {
  membership: 'Membership',
  individual_waitlist: 'Waitlist',
  impact_download: 'Impact Download',
  newsletter: 'Newsletter',
  contact: 'Contact',
  volunteer: 'Volunteer',
  aisummit_openai: 'AI Summit — OpenAI',
  aisummit_survey: 'AI Summit — Survey',
};

const REVIEW_TABS = [
  { value: '', label: 'All' },
  { value: '0', label: 'Needs Review' },
  { value: '1', label: 'Reviewed' },
];

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
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  async function handleDelete(id) {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/forms/submissions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch (err) {
      setError('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (reviewedFilter) params.set('reviewed', reviewedFilter);
      const qs = params.toString();
      const res = await apiFetch(`/api/forms/submissions/export${qs ? '?' + qs : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `berg-submissions-${typeFilter || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Form Submissions</h1>
          <p className={styles.subtitle}>Review, track, and export submissions from site forms.</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/admin/surveys/aisummit" className={styles.mutedLink}>
            AI Summit Survey Results
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || pagination.total === 0}
            className={styles.primaryBtn}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.tabBar} role="tablist">
            {REVIEW_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => handleFilterChange(setReviewedFilter)({ target: { value: t.value } })}
                className={`${styles.tab}${reviewedFilter === t.value ? ` ${styles.tabActive}` : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={handleFilterChange(setTypeFilter)}
            className={styles.select}
            aria-label="Filter by form type"
          >
            {FORM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <span className={styles.count}>
          {pagination.total} total submission{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading / Error */}
      {loading && <p className={styles.stateMsg}>Loading submissions…</p>}
      {error && <p className={styles.errorMsg}>Error: {error}</p>}

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
          <p>No submissions found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && submissions.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.dotCell} aria-label="Review status"></th>
                <th>Type</th>
                <th>Submitter</th>
                <th className={styles.dateCell}>Submitted</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const { name, email } = getSubmitterInfo(sub);
                const pillClass = styles[TYPE_PILL_CLASS[sub.form_type]] || styles.pillNeutral;
                return (
                  <tr key={sub.id} className={sub.reviewed ? undefined : styles.unreadRow}>
                    <td className={styles.dotCell}>
                      <span
                        className={`${styles.dot} ${sub.reviewed ? styles.dotRead : styles.dotUnread}`}
                        title={sub.reviewed ? 'Reviewed' : 'Needs review'}
                      />
                    </td>
                    <td>
                      <span className={`${styles.pill} ${pillClass}`}>
                        {TYPE_LABELS[sub.form_type] || sub.form_type}
                      </span>
                    </td>
                    <td className={styles.submitterCell}>
                      <div className={styles.submitterName}>{name}</div>
                      <div className={styles.submitterEmail}>{email}</div>
                    </td>
                    <td className={styles.dateCell}>{formatDate(sub.created_at)}</td>
                    <td className={styles.actionCell}>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleToggleReview(sub.id)}
                          disabled={togglingId === sub.id}
                          className={`${styles.secondaryBtn}${sub.reviewed ? '' : ` ${styles.reviewBtnUnread}`}`}
                        >
                          {togglingId === sub.id ? '...' : sub.reviewed ? 'Undo Review' : 'Mark Reviewed'}
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={deletingId === sub.id}
                          title="Delete submission"
                          className={styles.dangerBtn}
                        >
                          {deletingId === sub.id ? '...' : 'Delete'}
                        </button>
                        <Link to={`/admin/forms/${sub.id}`} className={styles.viewLink}>
                          View
                          <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={styles.pageBtn}
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            Prev
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className={styles.pageBtn}
          >
            Next
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
