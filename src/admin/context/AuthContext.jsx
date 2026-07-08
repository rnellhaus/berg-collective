import { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Google sign-in failed');
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
