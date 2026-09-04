import { authStore } from './authStore';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { queryClient } from '../services/queryClient';
import { clearOfflineQueue } from '../hooks/useOfflineSync';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/notifications';
import { User } from '../types';

jest.mock('../services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
}));
jest.mock('../services/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('../services/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));
jest.mock('../hooks/useOfflineSync', () => ({
  clearOfflineQueue: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/notifications', () => ({
  registerForPushNotifications: jest.fn(),
  unregisterPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedQueryClient = queryClient as jest.Mocked<typeof queryClient>;
const mockedClearOfflineQueue = clearOfflineQueue as jest.Mock;
const mockedRegisterForPush = registerForPushNotifications as jest.Mock;
const mockedUnregisterFromPush = unregisterPushNotifications as jest.Mock;

const mockUser = { id: 'u1', username: 'joe' } as User;

beforeEach(() => {
  jest.clearAllMocks();
  authStore.setState({ isSignedIn: false, user: null });
  mockedApi.defaults.headers.common = {};
});

describe('login', () => {
  it('persists both tokens, sets the auth header, and marks the user signed in', async () => {
    mockedApi.post.mockResolvedValue({
      data: { user: mockUser, access_token: 'access-1', refresh_token: 'refresh-1' },
    });

    await authStore.getState().login('joe@example.com', 'pw');

    expect(mockedStorage.setItem).toHaveBeenCalledWith('access_token', 'access-1');
    expect(mockedStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-1');
    expect(mockedApi.defaults.headers.common['Authorization']).toBe('Bearer access-1');
    expect(authStore.getState().isSignedIn).toBe(true);
    expect(authStore.getState().user).toEqual(mockUser);
  });

  it("clears the previous session's query cache and offline queue — a switched account must never see stale data", async () => {
    mockedApi.post.mockResolvedValue({
      data: { user: mockUser, access_token: 'access-1', refresh_token: 'refresh-1' },
    });

    await authStore.getState().login('joe@example.com', 'pw');

    expect(mockedQueryClient.clear).toHaveBeenCalled();
    expect(mockedClearOfflineQueue).toHaveBeenCalled();
  });

  it("re-registers this device's push token against the account that just signed in", async () => {
    mockedApi.post.mockResolvedValue({
      data: { user: mockUser, access_token: 'access-1', refresh_token: 'refresh-1' },
    });

    await authStore.getState().login('joe@example.com', 'pw');

    expect(mockedRegisterForPush).toHaveBeenCalled();
  });
});

describe('register', () => {
  it('reports that email confirmation is required without signing the user in', async () => {
    mockedApi.post.mockResolvedValue({ data: { requires_email_confirmation: true } });

    const result = await authStore.getState().register('new@example.com', 'StrongPass123!');

    expect(result).toEqual({ requiresEmailConfirmation: true });
    expect(authStore.getState().isSignedIn).toBe(false);
    expect(mockedStorage.setItem).not.toHaveBeenCalled();
  });

  it('logs the user straight in when the backend hands back a session (confirmation off)', async () => {
    mockedApi.post.mockResolvedValue({
      data: { user: mockUser, access_token: 'access-1', refresh_token: 'refresh-1' },
    });

    const result = await authStore.getState().register('new@example.com', 'StrongPass123!');

    expect(result).toEqual({ requiresEmailConfirmation: false });
    expect(authStore.getState().isSignedIn).toBe(true);
    expect(authStore.getState().user).toEqual(mockUser);
    expect(mockedQueryClient.clear).toHaveBeenCalled();
  });
});

describe('confirmEmail', () => {
  it("exchanges Supabase's confirmation token for this app's own session", async () => {
    mockedApi.post.mockResolvedValue({
      data: { user: mockUser, access_token: 'access-1', refresh_token: 'refresh-1' },
    });

    await authStore.getState().confirmEmail('supabase-confirm-token');

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/confirm-email', { access_token: 'supabase-confirm-token' });
    expect(authStore.getState().isSignedIn).toBe(true);
    expect(authStore.getState().user).toEqual(mockUser);
    expect(mockedQueryClient.clear).toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('clears local state and the auth header even when the server revoke call fails', async () => {
    mockedStorage.getItem.mockResolvedValue('some-refresh-token');
    mockedApi.post.mockRejectedValue(new Error('network down'));
    mockedApi.defaults.headers.common['Authorization'] = 'Bearer access-1';
    authStore.setState({ isSignedIn: true, user: mockUser });

    await authStore.getState().logout();

    expect(mockedStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(mockedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(mockedApi.defaults.headers.common['Authorization']).toBeUndefined();
    expect(authStore.getState().isSignedIn).toBe(false);
    expect(authStore.getState().user).toBeNull();
  });

  it('skips the revoke call entirely when there is no stored refresh token', async () => {
    mockedStorage.getItem.mockResolvedValue(null);

    await authStore.getState().logout();

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(authStore.getState().isSignedIn).toBe(false);
  });

  it('clears the query cache and any queued offline mutations', async () => {
    mockedStorage.getItem.mockResolvedValue(null);

    await authStore.getState().logout();

    expect(mockedQueryClient.clear).toHaveBeenCalled();
    expect(mockedClearOfflineQueue).toHaveBeenCalled();
  });

  it("unregisters this device's push token while still authenticated, before clearing the session", async () => {
    mockedStorage.getItem.mockResolvedValue(null);
    mockedApi.defaults.headers.common['Authorization'] = 'Bearer access-1';

    await authStore.getState().logout();

    expect(mockedUnregisterFromPush).toHaveBeenCalled();
  });
});

describe('checkAuth', () => {
  it('does nothing when there is no stored access token', async () => {
    mockedStorage.getItem.mockResolvedValue(null);

    await authStore.getState().checkAuth();

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(authStore.getState().isSignedIn).toBe(false);
  });

  it('signs the user in when /users/me succeeds', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-token');
    mockedApi.get.mockResolvedValue({ data: mockUser });

    await authStore.getState().checkAuth();

    expect(authStore.getState().isSignedIn).toBe(true);
    expect(authStore.getState().user).toEqual(mockUser);
  });

  it('clears the session on a genuine 401 (already refreshed-and-failed by the interceptor)', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-token');
    mockedApi.get.mockRejectedValue({ response: { status: 401 } });

    await authStore.getState().checkAuth();

    expect(mockedStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(mockedStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(authStore.getState().isSignedIn).toBe(false);
    expect(authStore.getState().user).toBeNull();
  });

  it('keeps the session on a network error instead of forcing a re-login', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-token');
    mockedApi.get.mockRejectedValue(new Error('Network Error'));

    await authStore.getState().checkAuth();

    // isSignedIn was already set true before the /users/me call — a
    // transient connectivity blip (no response at all) must not wipe out
    // an otherwise-valid session, only a real 401 should.
    expect(authStore.getState().isSignedIn).toBe(true);
    expect(mockedStorage.removeItem).not.toHaveBeenCalled();
  });
});
