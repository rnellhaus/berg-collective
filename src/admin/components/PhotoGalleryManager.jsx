import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import styles from './PhotoGalleryManager.module.css';

function MediaPickerModal({ onConfirm, onCancel, apiFetch }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/media');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMediaItems(Array.isArray(data) ? data : data.items ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Photos</h3>
          <button className={styles.modalClose} onClick={onCancel} type="button">
            ✕
          </button>
        </div>

        {loading && <p className={styles.stateMsg}>Loading media…</p>}
        {error && <p className={styles.errorMsg}>Failed to load media: {error}</p>}

        {!loading && !error && mediaItems.length === 0 && (
          <p className={styles.stateMsg}>No media found. Upload images in the Media Library first.</p>
        )}

        {!loading && !error && mediaItems.length > 0 && (
          <div className={styles.mediaGrid}>
            {mediaItems.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.mediaThumb} ${isSelected ? styles.mediaThumbSelected : ''}`}
                  onClick={() => toggleSelect(item.id)}
                >
                  <img src={item.url || item.thumbnail_url} alt={item.filename || ''} />
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
        <div className={styles.sectionLabel}>Photo Gallery</div>
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
        <p className={styles.emptyMsg}>No photos yet. Click "Add Photos" to get started.</p>
      ) : (
        <div className={styles.photoGrid}>
          {localPhotos.map((photo, i) => (
            <div key={photo.id} className={styles.photoCard}>
              <div className={styles.photoThumbWrap}>
                <img
                  src={photo.url || photo.thumbnail_url}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className={styles.photoThumb}
                />
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
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.moveBtn}
                  onClick={() => movePhoto(i, 1)}
                  disabled={i === localPhotos.length - 1 || saving}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
              <input
                type="text"
                className={styles.captionInput}
                placeholder="Caption (optional)"
                defaultValue={photo.caption || ''}
              />
            </div>
          ))}
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
