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
    } catch {
      // Token expired/invalid — drop the session so the user is sent back to login.
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      set({ isSignedIn: false, user: null });
    }
  },
}));
