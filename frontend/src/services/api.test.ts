/**
 * Tests the response interceptor registered in api.ts — the 401-refresh
 * dance: single-flight refresh, queued concurrent 401s, retry with the new
 * token, and forced logout when the refresh itself fails. `axios` is
 * mocked entirely so this never makes a real network call; the interceptor
 * is captured directly off the mocked instance rather than exercised
 * through a real HTTP round-trip.
 */
interface FakeAxiosInstance {
  (config: unknown): unknown;
  defaults: { headers: { common: Record<string, string> } };
  interceptors: {
    response: { use: jest.Mock };
  };
}

interface MockedAxiosModule {
  create: jest.Mock;
  post: jest.Mock;
  __mockInstance: FakeAxiosInstance;
}

// Everything the factory needs is built inside it (not closed over an
// outer variable) — jest.mock factories run before the rest of this file's
// top-level code, so referencing a not-yet-initialized outer `const` here
// would be fragile. __mockInstance is how the test retrieves the same
// singleton afterward.
jest.mock('axios', () => {
  const instanceCall = jest.fn();
  const instance = Object.assign(instanceCall, {
    defaults: { headers: { common: {} as Record<string, string> } },
    interceptors: { response: { use: jest.fn() } },
  });
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
      post: jest.fn(),
      __mockInstance: instance,
    },
  };
});

jest.mock('./storage', () => ({
  storage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

// Same self-contained-factory reasoning as the axios mock above — an outer
// `const mockLogout = jest.fn()` closed over here was still undefined by
// the time this factory actually ran, even prefixed "mock".
jest.mock('../stores/authStore', () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  return {
    authStore: { getState: () => ({ isSignedIn: true, logout }) },
    __mockLogout: logout,
  };
});

jest.mock('expo-router', () => {
  const replace = jest.fn();
  return { router: { replace }, __mockReplace: replace };
});

import axios from 'axios';
import { storage } from './storage';
import './api'; // side-effect import: runs axios.create() + registers the interceptor

const mockedAxiosModule = axios as unknown as MockedAxiosModule;
const mockInstance = mockedAxiosModule.__mockInstance;
const instanceCall = mockInstance as unknown as jest.Mock;
const mockedPost = mockedAxiosModule.post;
const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockLogout = (jest.requireMock('../stores/authStore') as { __mockLogout: jest.Mock }).__mockLogout;
const mockReplace = (jest.requireMock('expo-router') as { __mockReplace: jest.Mock }).__mockReplace;

// Captured once, at module load — mockInstance.interceptors.response.use is
// itself a jest.fn() that jest.clearAllMocks() resets between tests, which
// would wipe its .mock.calls history (and this handler with it) if read
// fresh inside each test instead.
const rejected = mockInstance.interceptors.response.use.mock.calls[0][1] as (error: unknown) => Promise<unknown>;

interface FakeAxiosError {
  config: { _retry?: boolean; url?: string; headers: Record<string, string> };
  response?: { status: number };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInstance.defaults.headers.common = {};
});

describe('api response interceptor', () => {
  it('passes through a non-401 error untouched', async () => {
    const error: FakeAxiosError = { config: { headers: {} }, response: { status: 500 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('passes through a 401 from an /auth/ endpoint untouched', async () => {
    const error: FakeAxiosError = { config: { url: '/auth/login', headers: {} }, response: { status: 401 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('passes through a 401 that already went through one retry (no infinite loop)', async () => {
    const error: FakeAxiosError = { config: { _retry: true, headers: {} }, response: { status: 401 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('refreshes the token and retries the original request on a 401', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-refresh-token');
    mockedPost.mockResolvedValue({ data: { access_token: 'new-access', refresh_token: 'new-refresh' } });
    instanceCall.mockResolvedValue({ data: 'retried-ok' });

    const error: FakeAxiosError = { config: { headers: {} }, response: { status: 401 } };
    const result = await rejected(error);

    expect(mockedStorage.setItem).toHaveBeenCalledWith('access_token', 'new-access');
    expect(mockedStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh');
    expect(mockInstance.defaults.headers.common['Authorization']).toBe('Bearer new-access');
    expect(error.config.headers.Authorization).toBe('Bearer new-access');
    expect(instanceCall).toHaveBeenCalledWith(error.config);
    expect(result).toEqual({ data: 'retried-ok' });
  });

  it('logs out and rejects with the original error when the refresh call itself fails', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-refresh-token');
    mockedPost.mockRejectedValue(new Error('refresh failed'));

    const error: FakeAxiosError = { config: { headers: {} }, response: { status: 401 } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('shares a single refresh call across concurrent 401s instead of firing one each', async () => {
    mockedStorage.getItem.mockResolvedValue('stored-refresh-token');
    let resolveRefresh: (value: unknown) => void = () => {};
    mockedPost.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );
    instanceCall.mockResolvedValue({ data: 'retried-ok' });

    const errorA: FakeAxiosError = { config: { headers: {} }, response: { status: 401 } };
    const errorB: FakeAxiosError = { config: { headers: {} }, response: { status: 401 } };

    const resultA = rejected(errorA);
    const resultB = rejected(errorB);

    // Let errorA's handler advance past its `await storage.getItem(...)`
    // to the point where it actually calls axios.post — isRefreshing is
    // already set synchronously before that, which is what makes errorB's
    // call (also already fired above) take the queue branch instead of
    // starting a second refresh of its own.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockedPost).toHaveBeenCalledTimes(1);

    resolveRefresh({ data: { access_token: 'shared-access', refresh_token: 'shared-refresh' } });
    await resultA;
    await resultB;

    expect(errorA.config.headers.Authorization).toBe('Bearer shared-access');
    expect(errorB.config.headers.Authorization).toBe('Bearer shared-access');
    expect(instanceCall).toHaveBeenCalledTimes(2);
  });
});
