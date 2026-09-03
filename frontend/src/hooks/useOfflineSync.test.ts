import React from 'react';
import { renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOfflineSync, enqueueOfflineMutation } from './useOfflineSync';
import { api } from '../services/api';

jest.mock('../services/api', () => ({
  api: { post: jest.fn(), put: jest.fn() },
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedAddEventListener = NetInfo.addEventListener as jest.Mock;

const QUEUE_KEY = 'offline_mutation_queue';
const readQueue = async () => JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || '[]');

const triggerReconnect = async () => {
  const listener = mockedAddEventListener.mock.calls[mockedAddEventListener.mock.calls.length - 1][0];
  await listener({ isConnected: true });
};

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queryClient = new QueryClient();
});

describe('useOfflineSync', () => {
  it('flushes a queued mutation to the server on reconnect', async () => {
    await enqueueOfflineMutation('/sets', { weight: 100 });
    mockedApi.post.mockResolvedValue({ data: {} });

    await renderHook(() => useOfflineSync(), { wrapper });
    await triggerReconnect();

    expect(mockedApi.post).toHaveBeenCalledWith('/sets', { weight: 100 });
    expect(await readQueue()).toEqual([]);
  });

  it('flushes a queued PUT mutation (e.g. an exercise note) using PUT, not POST', async () => {
    await enqueueOfflineMutation('/workout-exercise-notes/w1/e1', { notes: 'Fue duro' }, 'PUT');
    mockedApi.put.mockResolvedValue({ data: {} });

    await renderHook(() => useOfflineSync(), { wrapper });
    await triggerReconnect();

    expect(mockedApi.put).toHaveBeenCalledWith('/workout-exercise-notes/w1/e1', { notes: 'Fue duro' });
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(await readQueue()).toEqual([]);
  });

  it('keeps a mutation queued if the retry also fails', async () => {
    await enqueueOfflineMutation('/sets', { weight: 100 });
    mockedApi.post.mockRejectedValue(new Error('still offline'));

    await renderHook(() => useOfflineSync(), { wrapper });
    await triggerReconnect();

    const stored = await readQueue();
    expect(stored).toHaveLength(1);
    expect(stored[0].url).toBe('/sets');
  });

  it('does not lose a mutation enqueued while an earlier one is still flushing', async () => {
    await enqueueOfflineMutation('/sets', { weight: 100 });

    let resolveFirstPost: () => void = () => {};
    mockedApi.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstPost = () => resolve({ data: {} });
        })
    );

    await renderHook(() => useOfflineSync(), { wrapper });
    const flushPromise = triggerReconnect();

    // A new set gets queued (e.g. logged offline by SetLogger) while the
    // first item's network request is still in flight — this must survive
    // the flush's own final write instead of being clobbered by a stale
    // pre-enqueue snapshot.
    await enqueueOfflineMutation('/sets', { weight: 200 });

    mockedApi.post.mockResolvedValue({ data: {} });
    resolveFirstPost();
    await flushPromise;

    const stored = await readQueue();
    expect(stored).toHaveLength(1);
    expect(stored[0].body).toEqual({ weight: 200 });
  });

  it('invalidates sets/battles/workouts/exercise-notes queries once a flush actually lands', async () => {
    await enqueueOfflineMutation('/sets', { weight: 100 });
    mockedApi.post.mockResolvedValue({ data: {} });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook(() => useOfflineSync(), { wrapper });
    await triggerReconnect();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sets'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['battles'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workouts'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercise-notes'] });
  });

  it('does not invalidate anything when the queue was already empty', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await renderHook(() => useOfflineSync(), { wrapper });
    await triggerReconnect();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
