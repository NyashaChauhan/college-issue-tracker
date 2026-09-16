// frontend/src/utils/api.js
// Axios instance with:
//   - Base URL pointing to backend
//   - Request interceptor: attaches window.__accessToken as Bearer token
//   - Response interceptor: on 401 TOKEN_EXPIRED → refresh → retry
//   - Queues concurrent requests during a single refresh call

import axios from 'axios';

// Access token lives in memory — NEVER in localStorage (XSS protection)
// window.__accessToken is set by AuthContext after login / refresh
if (typeof window !== 'undefined') {
  window.__accessToken = window.__accessToken || null;
}

const api = axios.create({
  baseURL:         '/api',         // proxied to http://localhost:5000/api by CRA proxy
  withCredentials: true,           // send httpOnly refreshToken cookie automatically
  headers: { 'Content-Type': 'application/json' },
});

// ── State for queuing concurrent requests during token refresh ──
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

// ── Request interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = window.__accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401         = error.response?.status === 401;
    const isExpired     = error.response?.data?.code === 'TOKEN_EXPIRED';
    const alreadyRetried = originalRequest._retry;

    // Don't retry refresh endpoint itself to prevent infinite loops
    const isRefreshCall = originalRequest.url?.includes('/auth/refresh');

    if (is401 && isExpired && !alreadyRetried && !isRefreshCall) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.accessToken;
        window.__accessToken = newToken;

        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      }catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed — the session is no longer valid.
      window.__accessToken = null;

      // Notify other tabs and AuthContext.
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('college-issue-tracker-auth');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
      }

      localStorage.setItem('auth_logout', Date.now().toString());
      localStorage.removeItem('auth_logout');

      return Promise.reject(refreshError);
    } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
