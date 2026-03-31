import { useEffect, useRef, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import styles from './DocumentsPage.module.css';

function CopyLinkButton({ slug }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e) {
    e.stopPropagation();
    const url = `${window.location.origin}/api/documents/file/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      className={styles.copyBtn}
      onClick={handleCopy}
      title="Copy public link"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

const CATEGORIES = ['All', 'Reports', 'Marketing', 'Legal', 'General'];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function fileIcon(mime) {
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime?.includes('word') || mime?.includes('document')) return 'description';
  if (mime?.includes('sheet') || mime?.includes('excel')) return 'table_chart';
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return 'slideshow';
  return 'draft';
}

export default function DocumentsPage() {
  const { apiFetch, uploadFile } = useApi();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detail form state
  const [detailTitle, setDetailTitle] = useState('');
  const [detailSlug, setDetailSlug] = useState('');
  const [detailCategory, setDetailCategory] = useState('General');

  const fileInputRef = useRef(null);

  const loadDocs = useCallback(async () => {
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category !== 'All') params.set('category', category);
      const res = await apiFetch(`/api/documents?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocs(data);
    } catch (err) {
      setLoadError(err.message || 'Failed to load documents');
    }
  }, [apiFetch, search, category]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  function openDetail(doc) {
    setSelected(doc);
    setDetailTitle(doc.title || '');
    setDetailSlug(doc.slug || '');
    setDetailCategory(doc.category || 'General');
    setDeleteConfirm(false);
  }

  function closeDetail() {
    setSelected(null);
    setDeleteConfirm(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/documents/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: detailTitle,
          slug: detailSlug,
          category: detailCategory,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated);
        setDetailSlug(updated.slug);
        setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const data = await res.json();
        alert(data.error || 'Save failed');
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
      const res = await apiFetch(`/api/documents/${selected.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== selected.id));
        closeDetail();
      }
    } catch {
      // ignore
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported format. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds 50 MB limit');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const res = await uploadFile('/api/documents/upload', file, {
        category: category !== 'All' ? category : 'General',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      await loadDocs();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search documents…"
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
          {uploadError && <span className={styles.uploadError}>{uploadError}</span>}
          {isAdmin && (
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <span className={styles.statsText}>
          {docs.length} {docs.length === 1 ? 'document' : 'documents'}
        </span>
      </div>

      {loadError && <div className={styles.errorMsg}>{loadError}</div>}

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Document list */}
        <div className={styles.listWrap}>
          {docs.length === 0 && !loadError ? (
            <div className={styles.emptyState}>No documents found. Upload your first document.</div>
          ) : (
            <div className={styles.docList}>
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  className={`${styles.docRow} ${selected?.id === doc.id ? styles.docRowActive : ''}`}
                  onClick={() => openDetail(doc)}
                >
                  <span className={`material-symbols-outlined ${styles.docIcon}`}>
                    {fileIcon(doc.mime_type)}
                  </span>
                  <div className={styles.docInfo}>
                    <span className={styles.docTitle}>{doc.title || doc.original_name}</span>
                    <span className={styles.docMeta}>
                      {doc.original_name} &middot; {formatBytes(doc.size_bytes)} &middot; {doc.category}
                    </span>
                  </div>
                  <CopyLinkButton slug={doc.slug} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailHeaderTitle}>Document Details</span>
              <button className={styles.closeBtn} onClick={closeDetail} aria-label="Close">&#x2715;</button>
            </div>

            <div className={styles.detailIcon}>
              <span className={`material-symbols-outlined ${styles.detailIconLg}`}>
                {fileIcon(selected.mime_type)}
              </span>
            </div>

            <div className={styles.detailFilename}>{selected.original_name}</div>

            <label className={styles.fieldLabel}>Title</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={detailTitle}
              onChange={(e) => setDetailTitle(e.target.value)}
              placeholder="Document title…"
            />

            <label className={styles.fieldLabel}>Slug (URL path)</label>
            <input
              className={styles.fieldInput}
              type="text"
              value={detailSlug}
              onChange={(e) => setDetailSlug(e.target.value)}
              placeholder="impact-report-2025"
            />
            <span className={styles.slugHint}>
              Public URL: /api/documents/file/{detailSlug || '…'}
            </span>

            <label className={styles.fieldLabel}>Category</label>
            <select
              className={styles.fieldSelect}
              value={detailCategory}
              onChange={(e) => setDetailCategory(e.target.value)}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {isAdmin && (
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}

            <div className={styles.fileInfo}>
              <div className={styles.fileInfoRow}>
                <span className={styles.fileInfoLabel}>File</span>
                <span>{selected.original_name}</span>
              </div>
              <div className={styles.fileInfoRow}>
                <span className={styles.fileInfoLabel}>Size</span>
                <span>{formatBytes(selected.size_bytes)}</span>
              </div>
              <div className={styles.fileInfoRow}>
                <span className={styles.fileInfoLabel}>Type</span>
                <span>{selected.mime_type}</span>
              </div>
              <div className={styles.fileInfoRow}>
                <span className={styles.fileInfoLabel}>Uploaded</span>
                <span>{new Date(selected.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>

            <a
              href={`/api/documents/file/${selected.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.previewBtn}
            >
              Open / Download
            </a>

            {isAdmin && (
              <div className={styles.deleteWrap}>
                {deleteConfirm ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Delete this document?</span>
                    <button className={styles.deleteConfirmBtn} onClick={handleDelete}>Yes, delete</button>
                    <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className={styles.deleteBtn} onClick={handleDelete}>
                    Delete Document
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
