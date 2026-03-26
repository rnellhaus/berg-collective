import { useState, useEffect } from 'react';

export function usePageContent(slug) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pages/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const map = {};
        for (const s of data.sections) {
          map[s.section_key] = s.fields;
        }
        setSections(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return { sections, loading };
}
