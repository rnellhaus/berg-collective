import { useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './MediaLibraryPage.module.css';

const CATEGORIES = ['All', 'Events', 'Pages', 'General'];
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

let uploadIdCounter = 0;

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  return `/api/media/file/${path}`;
}

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

async function uploadFileWithProgress(file, onProgress) {
  // Step 1: Upload directly to Vercel Blob (bypasses 4.5MB serverless limit)
  onProgress(10);

  const { upload } = await import('@vercel/blob/client');
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/media/upload/token',
  });

  onProgress(70);

  // Step 2: Tell backend to process the uploaded blob into optimized variants
  const res = await fetch('/api/media/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      blobUrl: blob.url,
      filename: file.name,
    }),
  });

  onProgress(100);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Processing failed (${res.status})`);
  }

  return res.json();
}

export default function MediaLibraryPage() {
  const { apiFetch } = useApi();
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
  const [isDragging, setIsDragging] = useState(false);
  const [batchUploads, setBatchUploads] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importAlt, setImportAlt] = useState('');
  const [importCategory, setImportCategory] = useState('General');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

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

  function validateFiles(fileList) {
    const valid = [];
    const errors = [];
    for (const file of fileList) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 10 MB`);
      } else {
        valid.push(file);
      }
    }
    return { valid, errors };
  }

  function startBatchUpload(files) {
    if (files.length === 0) return;

    const newItems = files.map((file) => ({
      id: ++uploadIdCounter,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending', // pending | uploading | done | error
      error: null,
    }));

    setBatchUploads((prev) => [...prev, ...newItems]);
    setUploading(true);
    setUploadError('');

    // Upload sequentially to avoid overwhelming the server
    const queue = [...newItems];
    (async () => {
      for (const item of queue) {
        setBatchUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading' } : u))
        );

        try {
          await uploadFileWithProgress(item.file, (pct) => {
            setBatchUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u))
            );
          });

          setBatchUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: 'done', progress: 100 } : u))
          );
        } catch (err) {
          setBatchUploads((prev) =>
            prev.map((u) =>
              u.id === item.id ? { ...u, status: 'error', error: err.message } : u
            )
          );
        }
      }

      await loadMedia();
      setUploading(false);
    })();
  }

  function dismissBatchUploads() {
    setBatchUploads((prev) => {
      // Revoke object URLs to free memory
      for (const item of prev) {
        if (item.preview) URL.revokeObjectURL(item.preview);
      }
      return [];
    });
  }

  async function handleFileChange(e) {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    const { valid, errors } = validateFiles(fileList);
    if (errors.length > 0) setUploadError(errors.join('; '));
    startBatchUpload(valid);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const fileList = Array.from(e.dataTransfer.files || []);
    if (fileList.length === 0) return;
    const { valid, errors } = validateFiles(fileList);
    if (errors.length > 0) setUploadError(errors.join('; '));
    startBatchUpload(valid);
  }

  async function handleImportUrl(e) {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError('');
    try {
      const res = await apiFetch('/api/media/import-url', {
        method: 'POST',
        body: JSON.stringify({
          url: importUrl.trim(),
          alt_text: importAlt.trim(),
          category: importCategory === 'All' ? null : importCategory,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Import failed (${res.status})`);
      }
      setShowImportModal(false);
      setImportUrl('');
      setImportAlt('');
      setImportCategory('General');
      await loadMedia();
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  }

  const pct = selected ? savingsPct(selected.original_size, selected.webp_size) : null;
  const hasActiveUploads = batchUploads.length > 0;
  const allDone = hasActiveUploads && batchUploads.every((u) => u.status === 'done' || u.status === 'error');
  const uploadedCount = batchUploads.filter((u) => u.status === 'done').length;
  const errorCount = batchUploads.filter((u) => u.status === 'error').length;

  return (
    <div
      className={styles.page}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropOverlayContent}>
            <span className={`material-symbols-outlined ${styles.dropIcon}`}>upload</span>
            <span className={styles.dropText}>Drop images to upload</span>
            <span className={styles.dropSubtext}>JPG, PNG, WebP, HEIC — up to 10 MB each</span>
          </div>
        </div>
      )}

      {/* Import from URL modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => !importLoading && setShowImportModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Import from URL</span>
              <button
                className={styles.closeBtn}
                onClick={() => !importLoading && setShowImportModal(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <form onSubmit={handleImportUrl} className={styles.modalBody}>
              <label className={styles.fieldLabel}>Image URL</label>
              <input
                className={styles.fieldInput}
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                required
                autoFocus
                disabled={importLoading}
              />
              <span className={styles.importHint}>
                Supports direct links, Google Drive, and Dropbox share URLs
              </span>

              <label className={styles.fieldLabel}>Alt Text (optional)</label>
              <input
                className={styles.fieldInput}
                type="text"
                value={importAlt}
                onChange={(e) => setImportAlt(e.target.value)}
                placeholder="Describe the image…"
                disabled={importLoading}
              />

              <label className={styles.fieldLabel}>Category</label>
              <select
                className={styles.fieldSelect}
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value)}
                disabled={importLoading}
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {importError && <div className={styles.importErrorMsg}>{importError}</div>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={importLoading || !importUrl.trim()}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">download</span>
                  {importLoading ? 'Importing…' : 'Import Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Media Library</h1>
          <p className={styles.subtitle}>Upload and organize images used across the site.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => setShowImportModal(true)}
            disabled={uploading || importLoading}
          >
            <span className="material-symbols-outlined" aria-hidden="true">add_link</span>
            Import from URL
          </button>
          <button
            className={styles.primaryBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <span className="material-symbols-outlined" aria-hidden="true">upload</span>
            {uploading ? 'Uploading…' : 'Upload Images'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              placeholder="Search by filename…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search media"
            />
          </div>
          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <span className={styles.count}>
          {media.length} {media.length === 1 ? 'image' : 'images'}
          {totalSavings > 0 && (
            <> &middot; {formatBytes(totalSavings)} saved via WebP</>
          )}
        </span>
      </div>

      {uploadError && <div className={styles.errorBanner}>{uploadError}</div>}

      {loadError && <div className={styles.errorMsg}>{loadError}</div>}

      {/* Upload progress panel */}
      {hasActiveUploads && (
        <div className={styles.uploadPanel}>
          <div className={styles.uploadPanelHeader}>
            <span className={styles.uploadPanelTitle}>
              {allDone
                ? `${uploadedCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
                : `Uploading ${batchUploads.length} ${batchUploads.length === 1 ? 'file' : 'files'}…`}
            </span>
            {allDone && (
              <button className={styles.uploadPanelDismiss} onClick={dismissBatchUploads}>
                Dismiss
              </button>
            )}
          </div>
          <div className={styles.uploadPanelList}>
            {batchUploads.map((item) => (
              <div key={item.id} className={styles.uploadItem}>
                <img className={styles.uploadItemThumb} src={item.preview} alt="" />
                <div className={styles.uploadItemInfo}>
                  <span className={styles.uploadItemName}>{item.name}</span>
                  {item.status === 'uploading' && (
                    <div className={styles.progressBarWrap}>
                      <div className={styles.progressBar} style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.status === 'pending' && (
                    <span className={styles.uploadItemStatus}>Waiting…</span>
                  )}
                  {item.status === 'done' && (
                    <span className={styles.uploadItemDone}>Complete</span>
                  )}
                  {item.status === 'error' && (
                    <span className={styles.uploadItemError}>{item.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Grid */}
        <div className={`${styles.gridWrap} ${selected ? styles.gridWrapNarrow : ''}`}>
          {media.length === 0 && !loadError ? (
            <div className={styles.empty}>
              <span className="material-symbols-outlined" aria-hidden="true">photo_library</span>
              <p>No images found.</p>
            </div>
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
                    src={mediaUrl(item.webp_thumb) || `/api/media/file/thumb/${item.filename}`}
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
              <button className={styles.closeBtn} onClick={closeDetail} aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className={styles.detailPreviewWrap}>
              <img
                className={styles.detailPreview}
                src={mediaUrl(selected.webp_medium || selected.webp_thumb) || `/api/media/file/thumb/${selected.filename}`}
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
                    <span className="material-symbols-outlined" aria-hidden="true">delete</span>
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
