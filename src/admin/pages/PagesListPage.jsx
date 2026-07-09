import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import styles from './PagesListPage.module.css';

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
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.slug || '').toLowerCase().includes(q)
    );
  }, [pages, query]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pages</h1>
          <p className={styles.subtitle}>Manage content sections for each page of the site.</p>
        </div>
      </header>

      {!loading && !error && pages.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              placeholder="Search pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search pages"
            />
          </div>
          <span className={styles.count}>
            {filtered.length} page{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {loading && <p className={styles.stateMsg}>Loading pages…</p>}

      {error && <p className={styles.errorMsg}>Failed to load pages: {error}</p>}

      {!loading && !error && pages.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" aria-hidden="true">web</span>
          <p>No pages found.</p>
        </div>
      )}

      {!loading && !error && pages.length > 0 && filtered.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
          <p>No pages match “{query}”.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Page</th>
                <th>Slug</th>
                <th>Last updated</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => (
                <tr key={page.slug}>
                  <td>
                    <Link to={`/admin/pages/${page.slug}`} className={styles.pageTitle}>
                      {page.title || 'Untitled'}
                    </Link>
                  </td>
                  <td>
                    <span className={styles.slugChip}>/{page.slug}</span>
                  </td>
                  <td className={styles.muted}>{formatDate(page.updated_at || page.updatedAt)}</td>
                  <td className={styles.actionCell}>
                    <Link to={`/admin/pages/${page.slug}`} className={styles.editLink}>
                      Edit
                      <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
