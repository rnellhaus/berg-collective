import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

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
    <div style={{ flex: '1 1 160px', padding: '18px 20px', border: '1px solid #e8e1da', borderRadius: '8px', background: '#fff' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#8e5f57', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#191110', marginTop: '4px' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#9c8a86', marginTop: '2px' }}>{sub}</div>}
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
    return <p style={{ color: '#8e5f57', fontStyle: 'italic' }}>Loading survey results…</p>;
  }
  if (error) {
    return <p style={{ color: '#8b3223' }}>Error: {error}</p>;
  }
  if (!results) return null;

  const { totalResponses, overall, nps, sessions, responses } = results;

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#191110', margin: 0 }}>
            AI Summit 2026 — Pulse Survey
          </h1>
          <div style={{ fontSize: '0.82rem', color: '#8e5f57', marginTop: '4px' }}>
            Amplified Intelligence · June 27 · Squarespace HQ
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/admin/forms"
            style={{ fontSize: '0.82rem', fontWeight: '600', color: '#8b3223', textDecoration: 'none' }}
          >
            All submissions →
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting || totalResponses === 0}
            style={{
              padding: '7px 14px',
              border: '1px solid #8b3223',
              borderRadius: '6px',
              background: '#8b3223',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: exporting || totalResponses === 0 ? 'default' : 'pointer',
              opacity: exporting || totalResponses === 0 ? 0.5 : 1,
            }}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {totalResponses === 0 ? (
        <p style={{ color: '#8e5f57', fontStyle: 'italic' }}>
          No responses yet. Share the survey link: <code>bergcollective.org/aisummit/survey</code>
        </p>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
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
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#191110', margin: '0 0 12px' }}>
            Session ratings
          </h2>
          <div style={{ border: '1px solid #e8e1da', borderRadius: '8px', overflow: 'hidden', marginBottom: '28px', background: '#fff' }}>
            {sessions.map((s, i) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderBottom: i === sessions.length - 1 ? 'none' : '1px solid #e8e1da',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', color: '#191110' }}>{s.title}</div>
                <div style={{ width: '120px', height: '8px', background: '#f0eae4', borderRadius: '4px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: s.average != null ? `${(s.average / 5) * 100}%` : 0,
                      height: '100%',
                      background: '#D4AF37',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ width: '76px', textAlign: 'right', fontSize: '0.82rem', fontWeight: '600', color: '#191110', flexShrink: 0 }}>
                  {s.average != null ? s.average.toFixed(1) : '—'}
                  <span style={{ fontWeight: '400', color: '#9c8a86' }}> ({s.count})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Written feedback */}
          {TEXT_QUESTIONS.map(({ key, label }) => {
            const answers = responses.filter((r) => r[key]);
            if (answers.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#191110', margin: '0 0 12px' }}>
                  {label} <span style={{ fontWeight: '400', color: '#9c8a86', fontSize: '0.82rem' }}>({answers.length})</span>
                </h2>
                <div style={{ border: '1px solid #e8e1da', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                  {answers.map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: i === answers.length - 1 ? 'none' : '1px solid #e8e1da',
                      }}
                    >
                      <div style={{ fontSize: '0.88rem', color: '#191110', whiteSpace: 'pre-line' }}>{r[key]}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9c8a86', marginTop: '6px' }}>
                        {r.name || 'Anonymous'} · {formatDate(r.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
