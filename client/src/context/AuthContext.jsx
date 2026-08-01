import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dhaage_user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('dhaage_token') || null);
  const [loading, setLoading] = useState(false);

  const persist = useCallback((tok, usr) => {
    if (tok) localStorage.setItem('dhaage_token', tok);
    else localStorage.removeItem('dhaage_token');
    if (usr) localStorage.setItem('dhaage_user', JSON.stringify(usr));
    else localStorage.removeItem('dhaage_user');
    setToken(tok);
    setUser(usr);
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me', true).then((data) => {
        setUser(data.user);
        localStorage.setItem('dhaage_user', JSON.stringify(data.user));
      }).catch(() => {
        persist(null, null);
      });
    }
  }, [token, user, persist]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      persist(data.token, data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', payload);
      persist(data.token, data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.put('/auth/profile', payload, true);
    setUser(data.user);
    localStorage.setItem('dhaage_user', JSON.stringify(data.user));
    return data;
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

