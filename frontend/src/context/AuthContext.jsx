// frontend/src/context/AuthContext.jsx
// Global authentication state
// - Silently restores session on app load via POST /auth/refresh
// - Stores access token in memory (window.__accessToken), not localStorage
// - Exposes login, logout, and user state to the entire app

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../utils/api';

const AuthContext = createContext(null);
const AUTH_CHANNEL_NAME = 'college-issue-tracker-auth';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);   // true while we attempt silent refresh

  // ── Cross-tab authentication synchronization ───────────────
  useEffect(() => {
    let channel = null;

    // Primary method: BroadcastChannel
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);

      channel.addEventListener('message', handleAuthMessage);
    }

    // Fallback method: localStorage "storage" event
    window.addEventListener('storage', handleStorageEvent);

    function handleAuthMessage(event) {
      if (event.data?.type === 'LOGOUT') {
        window.__accessToken = null;
        setUser(null);
      }
    }

    function handleStorageEvent(event) {
      if (event.key === 'auth_logout') {
        window.__accessToken = null;
        setUser(null);
      }
    }

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleAuthMessage);
        channel.close();
      }

      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // ── Restore session on app load ────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        // Use plain axios here (not api instance) to avoid interceptor loops
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        window.__accessToken = data.accessToken;

        // Fetch profile with the new token
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.user);
      } catch {
        // No valid refresh token — user is logged out (silent fail is correct)
        window.__accessToken = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback((userData, accessToken) => {
    window.__accessToken = accessToken;
    setUser(userData);
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails, clear local state
    } finally {
      window.__accessToken = null;
      setUser(null);

      // Primary cross-tab notification
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      }

      // Fallback cross-tab notification
      localStorage.setItem('auth_logout', Date.now().toString());
      localStorage.removeItem('auth_logout');
    }
  }, []);

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
