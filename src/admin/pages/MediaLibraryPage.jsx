import { useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './MediaLibraryPage.module.css';

const CATEGORIES = ['All', 'Events', 'Pages', 'General'];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function savingsPct(original, webp) {
  if (!original || !webp || original === 0) return null;
  return Math.round(((original - webp) / original) * 100);
}

export default function MediaLibraryPage() {
  const { apiFetch, uploadFile } = useApi();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [media, setMedia] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [detailAlt, setDetailAlt] = useState('');
  const [detailCategory, setDetailCategory] = useState('General');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fileInputRef = useRef(null);

  const loadMedia = useCallback(async () => {
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category !== 'All') params.set('category', category);
      const res = await apiFetch(`/api/media?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load media');
      const data = await res.json();
      setMedia(data.media || []);
      setTotalSavings(data.totalSavings || 0);
    } catch (err) {
      setLoadError(err.message || 'Failed to load media');
    }
  }, [apiFetch, search, category]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  function openDetail(item) {
    setSelected(item);
    setDetailAlt(item.alt_text || '');
    setDetailCategory(item.category || 'General');
    setDeleteConfirm(false);
  }

  function closeDetail() {
    setSelected(null);
    setDeleteConfirm(false);
  }

  async function handleAltBlur() {
    if (!selected) return;
    if (detailAlt === selected.alt_text && detailCategory === selected.category) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/media/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ alt_text: detailAlt, category: detailCategory }),
      });
      if (res.ok) {
        const updated = { ...selected, alt_text: detailAlt, category: detailCategory };
        setSelected(updated);
        setMedia((prev) => prev.map((m) => (m.id === selected.id ? updated : m)));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCategoryChange(e) {
    const val = e.target.value;
    setDetailCategory(val);
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/media/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ alt_text: detailAlt, category: val }),
      });
      if (res.ok) {
        const updated = { ...selected, alt_text: detailAlt, category: val };
        setSelected(updated);
        setMedia((prev) => prev.map((m) => (m.id === selected.id ? updated : m)));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      const res = await apiFetch(`/api/media/${selected.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== selected.id));
        closeDetail();
        loadMedia();
      }
    } catch {
      // ignore
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await uploadFile('/api/media/upload', file);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }
      await loadMedia();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const pct = selected ? savingsPct(selected.original_size, selected.webp_size) : null;

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.topBarRight}>
          {uploading && <span className={styles.uploadingText}>Uploading…</span>}
          {uploadError && <span className={styles.uploadError}>{uploadError}</span>}
          <button
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload Images'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <span className={styles.statsText}>
          {media.length} {media.length === 1 ? 'image' : 'images'}
          {totalSavings > 0 && (
            <> &middot; {formatBytes(totalSavings)} saved via WebP</>
          )}
        </span>
      </div>

      {loadError && <div className={styles.errorMsg}>{loadError}</div>}

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Grid */}
        <div className={`${styles.gridWrap} ${selected ? styles.gridWrapNarrow : ''}`}>
          {media.length === 0 && !loadError ? (
            <div className={styles.emptyState}>No images found.</div>
          ) : (
            <div className={`${styles.grid} ${selected ? styles.gridNarrow : ''}`}>
              {media.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.thumb} ${selected?.id === item.id ? styles.thumbActive : ''}`}
                  onClick={() => openDetail(item)}
                  title={item.filename}
                >
                  <img
                    className={styles.thumbImg}
                    src={`/api/media/file/thumb/${item.webp_thumb || item.filename}`}
                    alt={item.alt_text || item.filename}
                    loading="lazy"
                  />
                  <span className={styles.thumbLabel}>{item.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailTitle}>Image Details</span>
              <button className={styles.closeBtn} onClick={closeDetail} aria-label="Close">&#x2715;</button>
            </div>

            <div className={styles.detailPreviewWrap}>
              <img
                className={styles.detailPreview}
                src={`/api/media/file/thumb/${selected.webp_thumb || selected.filename}`}
                alt={selected.alt_text || selected.filename}
              />
            </div>

            <div className={styles.detailFilename}>{selected.filename}</div>

            <label className={styles.fieldLabel}>Alt Text</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={detailAlt}
              onChange={(e) => setDetailAlt(e.target.value)}
              onBlur={handleAltBlur}
              placeholder="Describe the image…"
            />

            <label className={styles.fieldLabel}>Category</label>
            <select
              className={styles.fieldSelect}
              value={detailCategory}
              onChange={handleCategoryChange}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {saving && <div className={styles.savingMsg}>Saving…</div>}

            <div className={styles.fileInfo}>
              {selected.width && selected.height && (
                <div className={styles.fileInfoRow}>
                  <span className={styles.fileInfoLabel}>Dimensions</span>
                  <span>{selected.width} &times; {selected.height}</span>
                </div>
              )}
              {selected.original_size != null && (
                <div className={styles.fileInfoRow}>
                  <span className={styles.fileInfoLabel}>Original size</span>
                  <span>{formatBytes(selected.original_size)}</span>
                </div>
              )}
              {selected.webp_size != null && (
                <div className={styles.fileInfoRow}>
                  <span className={styles.fileInfoLabel}>WebP size</span>
                  <span>{formatBytes(selected.webp_size)}</span>
                </div>
              )}
              {pct !== null && (
                <div className={styles.fileInfoRow}>
                  <span className={styles.fileInfoLabel}>Savings</span>
                  <span className={styles.savingsBadge}>{pct}%</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className={styles.deleteWrap}>
                {deleteConfirm ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Delete this image?</span>
                    <button className={styles.deleteConfirmBtn} onClick={handleDelete}>Yes, delete</button>
                    <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className={styles.deleteBtn} onClick={handleDelete}>
                    Delete Image
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
