import { useEffect } from 'react';

const SITE_URL = 'https://bergcollective.org';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/photos/DTRT-crowd-photo.jpg`;

function upsertMeta(selector, attrName, attrValue, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function usePageMeta(title, description, options = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} - BERG Collective` : 'BERG Collective';
    const path = options.path || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
    const ogImage = options.image ? (options.image.startsWith('http') ? options.image : `${SITE_URL}${options.image}`) : DEFAULT_OG_IMAGE;
    const desc = description || '';

    document.title = fullTitle;

    if (desc) upsertMeta('meta[name="description"]', 'name', 'description', desc);

    upsertLink('canonical', canonical);

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    if (desc) upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'BERG Collective');

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    if (desc) upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
  }, [title, description, options.path, options.image]);
}
