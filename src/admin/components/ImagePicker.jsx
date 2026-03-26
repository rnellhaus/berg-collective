import { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import styles from './ImagePicker.module.css';

export default function ImagePicker({ isOpen, onClose, onSelect, currentImageId }) {
  const { apiFetch, uploadFile } = useApi();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setError(null);
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/media');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : data.items ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, apiFetch]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadFile('/api/media/upload', file);
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
      const uploaded = await res.json();
      const newItem = uploaded.media ?? uploaded;
      setMedia((prev) => [newItem, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSelect(item) {
    onSelect(item);
    onClose();
  }

  const filtered = media.filter((item) => {
    if (!search.trim()) return true;
    const name = (item.filename || item.name || item.url || '').toLowerCase();
    return name.includes(search.trim().toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Choose Image</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload New'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.gridArea}>
          {loading && <p className={styles.statusMsg}>Loading media…</p>}
          {!loading && filtered.length === 0 && (
            <p className={styles.statusMsg}>No images found.</p>
          )}
          {!loading && filtered.length > 0 && (
            <div className={styles.grid}>
              {filtered.map((item) => {
                const id = item.id ?? item._id;
                const url = item.url ?? item.src;
                const name = item.filename ?? item.name ?? 'image';
                const isSelected = String(id) === String(currentImageId);
                return (
                  <button
                    key={id ?? url}
                    className={`${styles.thumb} ${isSelected ? styles.thumbSelected : ''}`}
                    onClick={() => handleSelect(item)}
                    title={name}
                  >
                    <img src={url} alt={name} className={styles.thumbImg} />
                    <span className={styles.thumbLabel}>{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
