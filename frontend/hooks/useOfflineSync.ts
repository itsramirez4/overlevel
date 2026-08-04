import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const QUEUE_KEY = 'offline_mutation_queue';

interface QueuedMutation {
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

export const enqueueOfflineMutation = async (url: string, body: unknown) => {
  const queue = await getQueue();
  queue.push({ url, body });
  await setQueue(queue);
};

export const useOfflineSync = () => {
  const syncing = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || syncing.current) return;

      syncing.current = true;
      const queue = await getQueue();
      const remaining: QueuedMutation[] = [];

      for (const item of queue) {
        try {
          await api.post(item.url, item.body);
        } catch {
          remaining.push(item);
        }
      }

      await setQueue(remaining);
      syncing.current = false;
    });

    return unsubscribe;
  }, []);
};
