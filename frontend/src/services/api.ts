import axios from 'axios';
import { router } from 'expo-router';
import { API_URL } from '../utils/constants';
import { storage } from './storage';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  pendingQueue = [];
};

const forceLogout = async () => {
  // Lazy require, not a top-level import: authStore.ts imports `api` from
  // this file, so a static import here would be circular. Deferring
  // resolution to call time (same effect as the dynamic import() this used
  // to be) breaks that cycle — and unlike import(), this transpiles to a
  // plain require() that Jest's module mocking actually intercepts.
  const { authStore } = require('../stores/authStore') as typeof import('../stores/authStore');
  if (authStore.getState().isSignedIn) {
    await authStore.getState().logout();
    router.replace('/(auth)/login');
  }
};

/**
 * Access tokens are short-lived (15 min) by design — a 401 doesn't always
 * mean the session is dead, it usually just means the access token expired
 * and needs renewing via the refresh token. Only fall back to logging out
 * once the refresh itself fails. Concurrent 401s share a single refresh
 * call instead of each firing their own.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes('/auth/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await storage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token stored');

      const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken });

      await storage.setItem('access_token', data.access_token);
      await storage.setItem('refresh_token', data.refresh_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

      processQueue(null, data.access_token);

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await forceLogout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
