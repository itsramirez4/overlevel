import { authStore } from '../stores/authStore';

export const authService = {
  login: (email: string, password: string) => authStore.getState().login(email, password),
  logout: () => authStore.getState().logout(),
};
