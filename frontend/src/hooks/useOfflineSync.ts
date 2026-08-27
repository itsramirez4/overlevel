import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const QUEUE_KEY = 'offline_mutation_queue';

interface QueuedMutation {
  id: string;
  url: string;
  body: unknown;
}

const getQueue = async (): Promise<QueuedMutation[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const setQueue = async (queue: QueuedMutation[]) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

/**
 * AsyncStorage has no transactions — a read-modify-write here and another
 * one in the flush loop below could otherwise interleave (enqueue reads the
 * queue, flush reads the same queue, flush writes back a version that never
 * saw the enqueue's addition, enqueue's own write is then the one that
 * "wins" or loses depending on timing — either way, an update can vanish).
 * Chaining every read-modify-write through this promise serializes them
 * within the JS process, so there's always at most one in flight.
 */
let queueLock: Promise<unknown> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queueLock.then(fn, fn);
  queueLock = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export const enqueueOfflineMutation = (url: string, body: unknown) =>
  withQueueLock(async () => {
    const queue = await getQueue();
    queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url, body });
    await setQueue(queue);
  });

export const useOfflineSync = () => {
  const syncing = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || syncing.current) return;

      syncing.current = true;
      const queue = await getQueue();
      let flushedAny = false;

      for (const item of queue) {
        try {
          await api.post(item.url, item.body);
          flushedAny = true;
          // Remove just this one item, re-reading the queue under the same
          // lock enqueueOfflineMutation uses — not the snapshot taken
          // before this loop started — so a set queued by SetLogger while
          // this flush is still running survives instead of getting
          // silently overwritten by a stale write.
          await withQueueLock(async () => {
            const current = await getQueue();
            await setQueue(current.filter((q) => q.id !== item.id));
          });
        } catch {
          // Leave it queued — retried on the next reconnect.
        }
      }

      // The reconnect event also fires React Query's own refetch-on-reconnect
      // (see onlineManager wiring in _layout.tsx) — but that races ahead of
      // this flush and normally wins, so whatever screen is open keeps
      // showing pre-sync data (missing set, undamaged battle, stale "Sin
      // conexión" banner) until the user manually reloads. Invalidating here,
      // after the flush actually lands, is what makes the newly-synced data
      // show up without that manual step.
      if (flushedAny) {
        queryClient.invalidateQueries({ queryKey: ['sets'] });
        queryClient.invalidateQueries({ queryKey: ['battles'] });
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
      }

      syncing.current = false;
    });

    return unsubscribe;
  }, [queryClient]);
};
