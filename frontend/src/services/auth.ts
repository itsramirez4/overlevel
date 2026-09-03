import { authStore } from '../stores/authStore';

export const authService = {
  login: (email: string, password: string) => authStore.getState().login(email, password),
  register: (email: string, password: string) => authStore.getState().register(email, password),
  confirmEmail: (accessToken: string) => authStore.getState().confirmEmail(accessToken),
  logout: () => authStore.getState().logout(),
};
