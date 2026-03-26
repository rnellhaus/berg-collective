import { useCallback } from 'react';

async function refreshToken() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  return res.ok;
}

export function useApi() {
  const apiFetch = useCallback(async (path, options = {}) => {
    const opts = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    let res = await fetch(path, opts);

    if (res.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        res = await fetch(path, opts);
      }
    }

    return res;
  }, []);

  const uploadFile = useCallback(async (path, file, extraFields = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }

    let res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
    });

    if (res.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        res = await fetch(path, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      }
    }

    return res;
  }, []);

  return { apiFetch, uploadFile };
}
