import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import RsvpConfig from '../components/RsvpConfig';
import PhotoGalleryManager from '../components/PhotoGalleryManager';
import styles from './EventEditorPage.module.css';

const CATEGORIES = ['Networking', 'Finance', 'Workshop', 'Summit', 'Cultural'];
const CITIES = [
  { value: 'nyc', label: 'New York City' },
  { value: 'la', label: 'Los Angeles' },
  { value: 'atlanta', label: 'Atlanta' },
  { value: 'dc', label: 'Washington D.C.' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'houston', label: 'Houston' },
];

function getThumbUrl(item) {
  if (item.webp_thumb) return `/api/media/file/thumb/${item.webp_thumb.split('/').pop()}`;
  if (item.webp_medium) return `/api/media/file/medium/${item.webp_medium.split('/').pop()}`;
  return null;
}

function CoverImagePicker({ value, onChange, apiFetch }) {
  const [showPicker, setShowPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function loadMedia() {
    setLoading(true);
    setError(null);
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

  async function openPicker() {
    setShowPicker(true);
    loadMedia();
  }

  function selectImage(item) {
    onChange(item);
    setShowPicker(false);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', 'event');
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Select the newly uploaded image
      selectImage(data.media);
      // Refresh the grid
      loadMedia();
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const thumbUrl = value ? getThumbUrl(value) : null;

  return (
    <div>
      <div className={styles.coverRow}>
        {thumbUrl ? (
          <img src={thumbUrl} alt="Cover" className={styles.coverThumb} />
        ) : value ? (
          <div className={styles.coverPlaceholder} style={{ background: '#f0ebe6', color: '#8e5f57', fontSize: '12px' }}>Image selected (ID: {value.id})</div>
        ) : (
          <div className={styles.coverPlaceholder}>No image selected</div>
        )}
        <button type="button" className={styles.chooseCoverBtn} onClick={openPicker}>
          Choose from Library
        </button>
        <label className={styles.chooseCoverBtn} style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Upload New'}
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
        {value && (
          <button type="button" className={styles.removeCoverBtn} onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>

      {showPicker && (
        <div className={styles.modalOverlay} onClick={() => setShowPicker(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Choose Image</h3>
              <button className={styles.modalClose} type="button" onClick={() => setShowPicker(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px' }}>
              <label style={{
                padding: '8px 16px', background: '#8b3223', color: '#fff', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}>
                {uploading ? 'Uploading…' : 'Upload New Image'}
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>
            {loading && <p className={styles.stateMsg}>Loading media…</p>}
            {error && <p className={styles.errorMsg}>{error}</p>}
            {!loading && !error && mediaItems.length === 0 && (
              <p className={styles.stateMsg}>No media found. Upload an image to get started.</p>
            )}
            {!loading && !error && mediaItems.length > 0 && (
              <div className={styles.pickerGrid}>
                {mediaItems.map((item) => {
                  const src = getThumbUrl(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.pickerThumb} ${value && value.id === item.id ? styles.pickerThumbSelected : ''}`}
                      onClick={() => selectImage(item)}
                    >
                      {src ? (
                        <img src={src} alt={item.filename || ''} />
                      ) : (
                        <span style={{ fontSize: '10px', color: '#8e5f57' }}>{item.filename}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  location: '',
  category: '',
  chapter: '',
  status: 'upcoming',
  featured: false,
  cover_image_id: null,
  rsvp_platform: 'luma',
  rsvp_url: '',
  rsvp_event_id: '',
};

export default function EventEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined || id === 'new';
  const navigate = useNavigate();
  const { apiFetch } = useApi();
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [coverImage, setCoverImage] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customCity, setCustomCity] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/events/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const event = data.event || data;
      setForm({
        title: event.title || '',
        description: event.description || '',
        date: event.date ? event.date.slice(0, 10) : '',
        time: event.time || '',
        location: event.location || '',
        category: event.category || '',
        chapter: event.chapter || '',
        status: event.status || 'upcoming',
        featured: !!event.featured,
        cover_image_id: event.cover_image_id || null,
        rsvp_platform: event.rsvp_platform || 'luma',
        rsvp_url: event.rsvp_url || '',
        rsvp_event_id: event.rsvp_event_id || '',
      });
      if (event.cover_image) setCoverImage(event.cover_image);
      setPhotos(event.photos || []);
      if (event.chapter && !CITIES.some(c => c.value === event.chapter)) {
        setCustomCity(true);
      }
    } catch (err) {
      setError('Failed to load event: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id]);

  useEffect(() => {
    if (!isNew) {
      loadEvent();
    }
  }, [isNew, loadEvent]);

  function handleField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleRsvpChange({ platform, url, eventId }) {
    setForm((prev) => ({
      ...prev,
      rsvp_platform: platform,
      rsvp_url: url,
      rsvp_event_id: eventId,
    }));
  }

  function handleCoverChange(item) {
    setCoverImage(item);
    setForm((prev) => ({ ...prev, cover_image_id: item ? item.id : null }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/events' : `/api/events/${id}`;
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('/admin/events');
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate('/admin/events');
    } catch (err) {
      setError('Failed to delete: ' + err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return <p className={styles.stateMsg}>Loading event…</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>{isNew ? 'New Event' : 'Edit Event'}</h1>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/admin/events')}
        >
          ← Back to Events
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Event Details</div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Title</label>
            <input
              type="text"
              className={styles.input}
              value={form.title}
              onChange={(e) => handleField('title', e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              placeholder="Event description…"
              rows={5}
            />
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.date}
                onChange={(e) => handleField('date', e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Time</label>
              <input
                type="text"
                className={styles.input}
                value={form.time}
                onChange={(e) => handleField('time', e.target.value)}
                placeholder="e.g. 6:00 PM"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Location</label>
            <input
              type="text"
              className={styles.input}
              value={form.location}
              onChange={(e) => handleField('location', e.target.value)}
              placeholder="Venue name and address"
            />
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => handleField('category', e.target.value)}
              >
                <option value="">— Select category —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>City</label>
              <select
                className={styles.select}
                value={customCity ? '__custom__' : form.chapter}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomCity(true);
                    handleField('chapter', '');
                  } else {
                    setCustomCity(false);
                    handleField('chapter', e.target.value);
                  }
                }}
              >
                <option value="">— Select city —</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="__custom__">Other (type your own)</option>
              </select>
              {customCity && (
                <input
                  type="text"
                  className={styles.input}
                  value={form.chapter}
                  onChange={(e) => handleField('chapter', e.target.value)}
                  placeholder="Enter city name, e.g. Miami"
                  style={{ marginTop: '8px' }}
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Status</label>
            <div className={styles.toggleGroup}>
              {['upcoming', 'past'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.toggleBtn} ${form.status === s ? styles.toggleBtnActive : ''}`}
                  onClick={() => handleField('status', s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => handleField('featured', e.target.checked)}
                className={styles.checkbox}
              />
              Featured event
            </label>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Cover Image</div>
          <CoverImagePicker
            value={coverImage}
            onChange={handleCoverChange}
            apiFetch={apiFetch}
          />
        </div>

        <RsvpConfig
          platform={form.rsvp_platform}
          url={form.rsvp_url}
          eventId={form.rsvp_event_id}
          onChange={handleRsvpChange}
        />

        {!isNew && (
          <PhotoGalleryManager
            eventId={id}
            photos={photos}
            onPhotosChange={loadEvent}
          />
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving}
          >
            {saving ? 'Saving…' : isNew ? 'Create Event' : 'Save Changes'}
          </button>

          {!isNew && user?.role === 'admin' && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
            >
              Delete Event
            </button>
          )}
        </div>
      </form>

      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete Event?</h3>
            <p className={styles.confirmMsg}>
              This will permanently delete <strong>{form.title || 'this event'}</strong> and all associated photos. This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
