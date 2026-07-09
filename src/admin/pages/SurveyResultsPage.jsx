import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './SurveyResultsPage.module.css';

const TEXT_QUESTIONS = [
  { key: 'most_valuable', label: 'What did you find most valuable about the programming?' },
  { key: 'general_feedback', label: 'Do you have general feedback about the summit?' },
  { key: 'next_summit', label: 'What should we change or add for the next summit?' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ label, value, sub }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function SurveyResultsPage() {
  const { apiFetch } = useApi();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/forms/aisummit-survey/results');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await apiFetch('/api/forms/submissions/export?type=aisummit_survey');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aisummit-survey-${new Date().toISOString().slice(0, 10)}.csv`;
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

  if (loading) {
    return <p className={styles.stateMsg}>Loading survey results…</p>;
  }
  if (error) {
    return <p className={styles.errorMsg}>Error: {error}</p>;
  }
  if (!results) return null;

  const { totalResponses, overall, nps, sessions, responses } = results;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Summit 2026 — Pulse Survey</h1>
          <p className={styles.subtitle}>Amplified Intelligence · June 27 · Squarespace HQ</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/admin/forms" className={styles.mutedLink}>
            All submissions
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || totalResponses === 0}
            className={styles.primaryBtn}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      {totalResponses === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" aria-hidden="true">ballot</span>
          <p>
            No responses yet. Share the survey link:{' '}
            <code className={styles.monoChip}>bergcollective.org/aisummit/survey</code>
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className={styles.statRow}>
            <StatCard label="Responses" value={totalResponses} />
            <StatCard
              label="Overall rating"
              value={overall.average != null ? `${overall.average.toFixed(1)} / 5` : '—'}
              sub={`${overall.count} rating${overall.count !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="NPS"
              value={nps.score != null ? nps.score : '—'}
              sub={`${nps.promoters} promoters · ${nps.detractors} detractors`}
            />
          </div>

          {/* Session ratings */}
          <section className={styles.section}>
            <h2 className={styles.sectionLabel}>Session Ratings</h2>
            <div className={styles.card}>
              {sessions.map((s) => (
                <div key={s.key} className={styles.sessionRow}>
                  <div className={styles.sessionTitle}>{s.title}</div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ '--fill': s.average != null ? `${(s.average / 5) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className={styles.sessionScore}>
                    {s.average != null ? s.average.toFixed(1) : '—'}
                    <span className={styles.sessionCount}> ({s.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Written feedback */}
          {TEXT_QUESTIONS.map(({ key, label }) => {
            const answers = responses.filter((r) => r[key]);
            if (answers.length === 0) return null;
            return (
              <section key={key} className={styles.section}>
                <h2 className={styles.sectionLabel}>
                  {label} <span className={styles.sectionCount}>({answers.length})</span>
                </h2>
                <div className={styles.card}>
                  {answers.map((r) => (
                    <div key={r.id} className={styles.quoteRow}>
                      <div className={styles.quoteText}>{r[key]}</div>
                      <div className={styles.quoteMeta}>
                        {r.name || 'Anonymous'} · {formatDate(r.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
