import { create } from 'zustand';
import { api } from '../services/api';
import { storage } from '../services/storage';

interface AuthStore {
  isSignedIn: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const authStore = create<AuthStore>((set) => ({
  isSignedIn: false,
  user: null,

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });

    await storage.setItem('access_token', data.access_token);
    await storage.setItem('refresh_token', data.refresh_token);

    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

    set({ isSignedIn: true, user: data.user });
  },

  logout: async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    set({ isSignedIn: false, user: null });
  },

  checkAuth: async () => {
    const token = await storage.getItem('access_token');
    if (!token) return;

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ isSignedIn: true });

    try {
      const { data: user } = await api.get('/users/me');
      set({ user });
    } catch (error: any) {
      // A genuine auth failure (401) only reaches here after the api.ts
      // interceptor already tried refreshing and failed — it has already
      // cleared storage and redirected via forceLogout(), so just mirror
      // that state. A network error (no response at all — offline, DNS,
      // backend down) is NOT a dead session; wiping valid tokens over a
      // transient connectivity blip would force a real re-login for no reason.
      if (error?.response?.status === 401) {
        await storage.removeItem('access_token');
        await storage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        set({ isSignedIn: false, user: null });
      }
    }
  },
}));
