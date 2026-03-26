export default function OptimizedImage({ media, size = 'medium', alt, width, height, loading = 'lazy', className, style }) {
  if (!media) return null;

  const webpKey = `webp_${size}`;
  const webpFile = media[webpKey] ? media[webpKey].split('/').pop() : null;
  const fallbackFile = media.jpg_fallback ? media.jpg_fallback.split('/').pop() : null;

  if (!webpFile && !fallbackFile) return null;

  const webpSrc = webpFile ? `/api/media/file/${size}/${webpFile}` : null;
  const fallbackSrc = fallbackFile ? `/api/media/file/fallback/${fallbackFile}` : null;

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
