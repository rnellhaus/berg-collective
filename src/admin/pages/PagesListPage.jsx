import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const containerStyle = {
  maxWidth: '800px',
};

const headingStyle = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: '#191110',
  margin: 0,
};

const subStyle = {
  color: '#8e5f57',
  marginTop: '6px',
  fontSize: '0.9rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '24px',
  background: '#ffffff',
  border: '1px solid #e8e1da',
  borderRadius: '8px',
  overflow: 'hidden',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '0.7rem',
  fontWeight: '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#8e5f57',
  background: '#f5f1ee',
  borderBottom: '1px solid #e8e1da',
};

const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #e8e1da',
  fontSize: '0.875rem',
  color: '#191110',
};

const tdMutedStyle = {
  ...tdStyle,
  color: '#8e5f57',
};

const linkStyle = {
  color: '#8b3223',
  textDecoration: 'none',
  fontWeight: '600',
};

const badgeStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.75rem',
  background: '#f5f1ee',
  color: '#8e5f57',
  fontFamily: 'monospace',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function PagesListPage() {
  const { apiFetch } = useApi();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/pages');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPages(Array.isArray(data) ? data : data.pages ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Pages</h1>
      <p style={subStyle}>Manage content sections for each page of the site.</p>

      {loading && (
        <p style={{ color: '#8e5f57', marginTop: '32px', fontStyle: 'italic' }}>Loading pages…</p>
      )}

      {error && (
        <p style={{ color: '#8b3223', marginTop: '32px' }}>Failed to load pages: {error}</p>
      )}

      {!loading && !error && pages.length === 0 && (
        <p style={{ color: '#8e5f57', marginTop: '32px', fontStyle: 'italic' }}>No pages found.</p>
      )}

      {!loading && !error && pages.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Last Updated</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, i) => (
              <tr
                key={page.slug}
                style={i === pages.length - 1 ? { borderBottom: 'none' } : {}}
              >
                <td style={tdStyle}>
                  <span style={badgeStyle}>{page.slug}</span>
                </td>
                <td style={tdStyle}>{page.title || '—'}</td>
                <td style={tdMutedStyle}>{formatDate(page.updated_at || page.updatedAt)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <Link to={`/admin/pages/${page.slug}`} style={linkStyle}>
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
