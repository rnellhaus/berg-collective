import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import FieldEditor from '../components/FieldEditor';
import ImagePicker from '../components/ImagePicker';
import styles from './PageEditorPage.module.css';

export default function PageEditorPage() {
  const { slug } = useParams();
  const { apiFetch } = useApi();

  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [fields, setFields] = useState({});
  const [dirtyFields, setDirtyFields] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState(null);

  // Load page + sections
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/pages/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const pageData = data.page ?? data;
        const sectionsData = data.sections ?? pageData.sections ?? [];
        setPage(pageData);
        setSections(sectionsData);
        if (sectionsData.length > 0) {
          const first = sectionsData[0];
          setActiveSection(first.key);
          setFields(first.fields ?? {});
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, apiFetch]);

  // When switching sections, save current field state into dirtyFields map, load new section
  function handleSectionClick(section) {
    if (activeSection) {
      setDirtyFields((prev) => ({ ...prev, [activeSection]: fields }));
    }
    setActiveSection(section.key);
    // Prefer dirty (unsaved edits) over original
    const sectionData = sections.find((s) => s.key === section.key);
    setFields(dirtyFields[section.key] ?? sectionData?.fields ?? {});
  }

  function handleFieldChange(updatedFields) {
    setFields(updatedFields);
  }

  function handleImagePickerOpen(fieldName) {
    setPickerField(fieldName);
    setPickerOpen(true);
  }

  function handleImageSelect(media) {
    if (!pickerField) return;
    const id = media.id ?? media._id ?? media.url;
    setFields((prev) => ({ ...prev, [pickerField]: id }));
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!activeSection) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/pages/${slug}/sections/${activeSection}`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Update local sections state with saved data
      setSections((prev) =>
        prev.map((s) => (s.key === activeSection ? { ...s, fields } : s))
      );
      // Remove from dirty map since it's saved
      setDirtyFields((prev) => {
        const next = { ...prev };
        delete next[activeSection];
        return next;
      });
      showToast('success', 'Section saved.');
    } catch (err) {
      showToast('error', `Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handlePreview() {
    const path = slug === 'home' ? '/' : `/${slug}`;
    window.open(path, '_blank', 'noopener');
  }

  const currentImageId = pickerField ? fields[pickerField] : null;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/admin/pages" className={styles.breadcrumbLink}>Pages</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>
          {loading ? slug : (page?.title || slug)}
        </span>
      </nav>

      {loading && (
        <p className={styles.statusMsg}>Loading page…</p>
      )}

      {error && (
        <p className={styles.errorMsg}>Failed to load page: {error}</p>
      )}

      {!loading && !error && (
        <>
          <div className={styles.headerRow}>
            <h1 className={styles.heading}>{page?.title || slug}</h1>
            <div className={styles.actions}>
              <button className={styles.previewBtn} onClick={handlePreview} type="button">
                Preview ↗
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !activeSection}
                type="button"
              >
                {saving ? 'Saving…' : 'Save Section'}
              </button>
            </div>
          </div>

          {/* Section Tabs */}
          {sections.length > 0 && (
            <div className={styles.tabs} role="tablist">
              {sections.map((section) => (
                <button
                  key={section.key}
                  role="tab"
                  aria-selected={activeSection === section.key}
                  className={`${styles.tab} ${activeSection === section.key ? styles.tabActive : ''}`}
                  onClick={() => handleSectionClick(section)}
                  type="button"
                >
                  {section.label ?? section.key}
                  {dirtyFields[section.key] !== undefined && activeSection !== section.key && (
                    <span className={styles.unsavedDot} title="Unsaved changes" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Field Editor */}
          {activeSection && (
            <div className={styles.editorCard}>
              <FieldEditor
                fields={fields}
                onChange={handleFieldChange}
                onImagePickerOpen={handleImagePickerOpen}
              />
            </div>
          )}

          {sections.length === 0 && (
            <p className={styles.statusMsg}>This page has no editable sections.</p>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      )}

      {/* Image Picker Modal */}
      <ImagePicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerField(null); }}
        onSelect={handleImageSelect}
        currentImageId={currentImageId}
      />
    </div>
  );
}
