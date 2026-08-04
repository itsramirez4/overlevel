import axios from 'axios';
import { router } from 'expo-router';
import { API_URL } from '../utils/constants';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Session can expire (or be invalidated) while the app is open — a 401 from
// any request means the token is no longer valid, so drop the session and
// send the user back to login instead of leaving them staring at a broken screen.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { authStore } = await import('../stores/authStore');
      if (authStore.getState().isSignedIn) {
        await authStore.getState().logout();
        router.replace('/(auth)/login');
      }
    }
    return Promise.reject(error);
  }
);
