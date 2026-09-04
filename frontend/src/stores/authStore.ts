import { create } from 'zustand';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { queryClient } from '../services/queryClient';
import { clearOfflineQueue } from '../hooks/useOfflineSync';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/notifications';
import { User } from '../types';
import { AuthResponse } from '../types/api';
import { getResponseStatus } from '../utils/errors';

interface AuthStore {
  isSignedIn: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  // Returns true if a confirmation email was sent and there's no session yet
  // (the normal case on this project — see authController.register). false
  // means it logged straight in, same as login().
  register: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  confirmEmail: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const authStore = create<AuthStore>((set) => {
  // Shared by login/register/confirmEmail — every path that can hand back a
  // fresh token pair needs the exact same "become signed in" side effects.
  const establishSession = async (data: AuthResponse) => {
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

    // Best-effort, fire-and-forget — re-registers this device's token (if
    // permission was already granted in an earlier session) against the
    // account that just signed in, so a device switching accounts doesn't
    // keep receiving the previous one's pushes indefinitely.
    registerForPushNotifications();
  };

  return {
    isSignedIn: false,
    user: null,

    login: async (email: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      await establishSession(data);
    },

    register: async (email: string, password: string) => {
      const { data } = await api.post<AuthResponse & { requires_email_confirmation?: boolean }>('/auth/register', {
        email,
        password,
      });
      if (data.requires_email_confirmation) return { requiresEmailConfirmation: true };
      await establishSession(data);
      return { requiresEmailConfirmation: false };
    },

    confirmEmail: async (accessToken: string) => {
      const { data } = await api.post<AuthResponse>('/auth/confirm-email', { access_token: accessToken });
      await establishSession(data);
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

      // Must run before the Authorization header below is removed — the
      // unregister call itself needs to still be authenticated as this user.
      await unregisterPushNotifications();

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
        registerForPushNotifications();
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
  };
});
