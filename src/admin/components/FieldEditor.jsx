import styles from './FieldEditor.module.css';

function labelFromKey(key) {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function FieldEditor({ fields, onChange, onImagePickerOpen }) {
  if (!fields || typeof fields !== 'object') return null;

  function handleChange(key, value) {
    onChange({ ...fields, [key]: value });
  }

  return (
    <div className={styles.wrap}>
      {Object.entries(fields).map(([key, value]) => {
        const label = labelFromKey(key);

        if (key.endsWith('_image_id')) {
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.label}>{label}</label>
              <div className={styles.imageRow}>
                {value ? (
                  <div className={styles.thumb}>
                    <span className={styles.thumbId}>ID: {value}</span>
                  </div>
                ) : (
                  <div className={`${styles.thumb} ${styles.thumbPlaceholder}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">image</span>
                  </div>
                )}
                <button
                  className={styles.chooseImgBtn}
                  onClick={() => onImagePickerOpen && onImagePickerOpen(key)}
                  type="button"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">imagesmode</span>
                  Choose Image
                </button>
              </div>
            </div>
          );
        }

        if (key.endsWith('_link')) {
          return (
            <div key={key} className={styles.fieldGroup}>
              <label className={styles.label}>{label}</label>
              <input
                type="url"
                className={styles.input}
                value={value ?? ''}
                placeholder="https://…"
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          );
        }

        // Text / textarea
        const strVal = value == null ? '' : String(value);
        const useTextarea = strVal.length > 100;
        return (
          <div key={key} className={styles.fieldGroup}>
            <label className={styles.label}>{label}</label>
            {useTextarea ? (
              <textarea
                className={styles.textarea}
                value={strVal}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            ) : (
              <input
                type="text"
                className={styles.input}
                value={strVal}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
