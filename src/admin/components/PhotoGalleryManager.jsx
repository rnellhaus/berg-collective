import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import styles from './PhotoGalleryManager.module.css';

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  return `/api/media/file/${path}`;
}

function getThumbUrl(item) {
  return mediaUrl(item.webp_thumb) || mediaUrl(item.webp_medium) || null;
}

function MediaPickerModal({ onConfirm, onCancel, apiFetch }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function loadMedia() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/media');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMediaItems(data.media || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMedia();
  }, [apiFetch]);

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('category', 'event');
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
        const data = await res.json();
        // Auto-select newly uploaded images
        if (data.media?.id) {
          setSelected(prev => [...prev, data.media.id]);
        }
      }
      await loadMedia();
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Event Photos</h3>
          <button className={styles.modalClose} onClick={onCancel} type="button">
            ✕
          </button>
        </div>

        <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{
            padding: '8px 16px', background: '#8b3223', color: '#fff', borderRadius: '8px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-block',
          }}>
            {uploading ? 'Uploading…' : 'Upload New Photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
          <span style={{ fontSize: '12px', color: '#8e5f57' }}>or select from library below</span>
        </div>

        {loading && <p className={styles.stateMsg}>Loading media…</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}

        {!loading && !error && mediaItems.length === 0 && (
          <p className={styles.stateMsg}>No media found. Upload some photos to get started.</p>
        )}

        {!loading && !error && mediaItems.length > 0 && (
          <div className={styles.mediaGrid}>
            {mediaItems.map((item) => {
              const isSelected = selected.includes(item.id);
              const src = getThumbUrl(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.mediaThumb} ${isSelected ? styles.mediaThumbSelected : ''}`}
                  onClick={() => toggleSelect(item.id)}
                >
                  {src ? (
                    <img src={src} alt={item.filename || ''} />
                  ) : (
                    <span style={{ fontSize: '10px', color: '#8e5f57' }}>{item.filename}</span>
                  )}
                  {isSelected && <span className={styles.checkMark}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={() => onConfirm(selected)}
            type="button"
            disabled={selected.length === 0}
          >
            Add {selected.length > 0 ? `${selected.length} Photo${selected.length > 1 ? 's' : ''}` : 'Photos'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoGalleryManager({ eventId, photos = [], onPhotosChange }) {
  const { apiFetch } = useApi();
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  async function handleAddPhotos(mediaIds) {
    if (!mediaIds.length) return;
    setShowPicker(false);
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/events/${eventId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ media_ids: mediaIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onPhotosChange();
    } catch (err) {
      setError('Failed to add photos: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(photoId) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/events/${eventId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onPhotosChange();
    } catch (err) {
      setError('Failed to remove photo: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReorder(newOrder) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/events/${eventId}/photos/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ photo_ids: newOrder.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLocalPhotos(newOrder);
      onPhotosChange();
    } catch (err) {
      setError('Failed to reorder photos: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function movePhoto(index, direction) {
    const newPhotos = [...localPhotos];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
    handleReorder(newPhotos);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.sectionLabel}>Photos ({localPhotos.length})</div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setShowPicker(true)}
          disabled={saving}
        >
          + Add Photos
        </button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {localPhotos.length === 0 ? (
        <p className={styles.emptyMsg}>No photos yet. Click "+ Add Photos" to upload or select from your media library.</p>
      ) : (
        <div className={styles.photoGrid}>
          {localPhotos.map((photo, i) => {
            const src = getThumbUrl(photo) || mediaUrl(photo.webp_medium);
            return (
              <div key={photo.id} className={styles.photoCard}>
                <div className={styles.photoThumbWrap}>
                  {src ? (
                    <img
                      src={src}
                      alt={photo.caption || `Photo ${i + 1}`}
                      className={styles.photoThumb}
                    />
                  ) : (
                    <div className={styles.photoThumb} style={{ background: '#f0ebe6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#8e5f57' }}>
                      No preview
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(photo.id)}
                    disabled={saving}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.photoControls}>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => movePhoto(i, -1)}
                    disabled={i === 0 || saving}
                    title="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => movePhoto(i, 1)}
                    disabled={i === localPhotos.length - 1 || saving}
                    title="Move right"
                  >
                    →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPicker && (
        <MediaPickerModal
          apiFetch={apiFetch}
          onConfirm={handleAddPhotos}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
