export default function OptimizedImage({ media, size = 'medium', alt, width, height, loading = 'lazy', className, style }) {
  if (!media) return null;

  const webpKey = `webp_${size}`;
  const webpValue = media[webpKey];
  const fallbackValue = media.jpg_fallback;

  if (!webpValue && !fallbackValue) return null;

  // If the value is already a full URL (Blob storage), use it directly
  // Otherwise, construct the /api/media/file/ path (legacy compatibility)
  function resolveUrl(value, sizeKey) {
    if (!value) return null;
    if (value.startsWith('http')) return value;
    const filename = value.split('/').pop();
    return `/api/media/file/${sizeKey}/${filename}`;
  }

  const webpSrc = resolveUrl(webpValue, size);
  const fallbackSrc = resolveUrl(fallbackValue, 'fallback');

  return (
    <picture>
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={fallbackSrc || webpSrc}
        alt={alt || media.alt_text || ''}
        width={width}
        height={height}
        loading={loading}
        className={className}
        style={style}
      />
    </picture>
  );
}
