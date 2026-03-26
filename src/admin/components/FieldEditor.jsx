function labelFromKey(key) {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const wrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const fieldGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle = {
  fontSize: '0.78rem',
  fontWeight: '700',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#8e5f57',
};

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #e8e1da',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontFamily: 'Epilogue, sans-serif',
  color: '#191110',
  background: '#fff',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '100px',
  lineHeight: '1.5',
};

const imageRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const thumbStyle = {
  width: '64px',
  height: '64px',
  objectFit: 'cover',
  borderRadius: '6px',
  border: '1px solid #e8e1da',
  background: '#f5f1ee',
  display: 'block',
  flexShrink: 0,
};

const thumbPlaceholderStyle = {
  ...thumbStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8e5f57',
  fontSize: '0.7rem',
};

const chooseImgBtnStyle = {
  padding: '6px 14px',
  background: '#fff',
  border: '1px solid #8b3223',
  borderRadius: '6px',
  color: '#8b3223',
  fontSize: '0.85rem',
  fontFamily: 'Epilogue, sans-serif',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

export default function FieldEditor({ fields, onChange, onImagePickerOpen }) {
  if (!fields || typeof fields !== 'object') return null;

  function handleChange(key, value) {
    onChange({ ...fields, [key]: value });
  }

  return (
    <div style={wrapStyle}>
      {Object.entries(fields).map(([key, value]) => {
        const label = labelFromKey(key);

        if (key.endsWith('_image_id')) {
          const previewUrl = null; // Image URL lookup would require a media map; show ID for now
          return (
            <div key={key} style={fieldGroupStyle}>
              <label style={labelStyle}>{label}</label>
              <div style={imageRowStyle}>
                {value ? (
                  <div style={{ ...thumbStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#8e5f57', textAlign: 'center', padding: '4px' }}>
                      ID: {value}
                    </span>
                  </div>
                ) : (
                  <div style={thumbPlaceholderStyle}>No image</div>
                )}
                <button
                  style={chooseImgBtnStyle}
                  onClick={() => onImagePickerOpen && onImagePickerOpen(key)}
                  type="button"
                >
                  Choose Image
                </button>
              </div>
            </div>
          );
        }

        if (key.endsWith('_link')) {
          return (
            <div key={key} style={fieldGroupStyle}>
              <label style={labelStyle}>{label}</label>
              <input
                type="url"
                style={inputStyle}
                value={value ?? ''}
                placeholder="https://…"
                onChange={(e) => handleChange(key, e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#8b3223')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e1da')}
              />
            </div>
          );
        }

        // Text / textarea
        const strVal = value == null ? '' : String(value);
        const useTextarea = strVal.length > 100;
        return (
          <div key={key} style={fieldGroupStyle}>
            <label style={labelStyle}>{label}</label>
            {useTextarea ? (
              <textarea
                style={textareaStyle}
                value={strVal}
                onChange={(e) => handleChange(key, e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#8b3223')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e1da')}
              />
            ) : (
              <input
                type="text"
                style={inputStyle}
                value={strVal}
                onChange={(e) => handleChange(key, e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = '#8b3223')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e1da')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
