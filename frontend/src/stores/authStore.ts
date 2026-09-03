import { create } from 'zustand';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { queryClient } from '../services/queryClient';
import { clearOfflineQueue } from '../hooks/useOfflineSync';
import { User } from '../types';
import { AuthResponse } from '../types/api';
import { getResponseStatus } from '../utils/errors';

interface AuthStore {
  isSignedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const authStore = create<AuthStore>((set) => ({
  isSignedIn: false,
  user: null,

  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });

    await storage.setItem('access_token', data.access_token);
    await storage.setItem('refresh_token', data.refresh_token);

    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

    // A previous account's data (workouts, character, stats…) can still be
    // sitting in the query cache from an earlier session on this device —
    // without this, a freshly logged-in account briefly (or not-so-briefly,
    // given the 30s staleTime) renders screens still showing whoever was
    // signed in before. Any mutation still queued offline from that earlier
    // session is dropped for the same reason — it must never replay against
    // this account's data instead.
    queryClient.clear();
    await clearOfflineQueue();

    set({ isSignedIn: true, user: data.user });
  },

  logout: async () => {
    const refreshToken = await storage.getItem('refresh_token');
    // Best-effort — an offline logout should still clear local state even
    // if the revoke call can't reach the server. Without this call at all,
    // the refresh token stayed valid server-side for its full 7-day
    // lifetime regardless of the user logging out.
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // Ignore — local logout proceeds regardless.
      }
    }

    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    queryClient.clear();
    await clearOfflineQueue();
    set({ isSignedIn: false, user: null });
  },

  checkAuth: async () => {
    const token = await storage.getItem('access_token');
    if (!token) return;

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ isSignedIn: true });

    try {
      const { data: user } = await api.get<User>('/users/me');
      set({ user });
    } catch (error) {
      // A genuine auth failure (401) only reaches here after the api.ts
      // interceptor already tried refreshing and failed — it has already
      // cleared storage and redirected via forceLogout(), so just mirror
      // that state. A network error (no response at all — offline, DNS,
      // backend down) is NOT a dead session; wiping valid tokens over a
      // transient connectivity blip would force a real re-login for no reason.
      if (getResponseStatus(error) === 401) {
        await storage.removeItem('access_token');
        await storage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        set({ isSignedIn: false, user: null });
      }
    }
  },
}));
