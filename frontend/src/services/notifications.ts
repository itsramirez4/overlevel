import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// expo-notifications has no real web implementation — scheduling/permission
// calls there are either no-ops or throw, so skip it outright rather than
// depend on every call site remembering to catch.
const isSupported = Platform.OS !== 'web';

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!isSupported) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      registerForPushNotifications();
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    // Fire-and-forget — the caller only cares about the permission result,
    // not whether the (separate, best-effort) push-token registration succeeded.
    if (granted) registerForPushNotifications();
    return granted;
  } catch {
    return false;
  }
};

const PUSH_TOKEN_STORAGE_KEY = 'overlevel-push-token';

/**
 * Registers this device for server-sent push notifications (new followers,
 * weekly recaps — see backend pushService.ts), distinct from the local-only
 * notifications above. Best-effort and silent throughout: called from
 * establishSession/checkAuth, where a push-registration failure must never
 * block signing in.
 */
export const registerForPushNotifications = async (): Promise<void> => {
  if (!isSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    await api.post('/users/me/push-token', { token, platform: Platform.OS });
  } catch {
    // Best-effort.
  }
};

/**
 * Called on logout — must run while the account's auth header is still
 * attached, or the unregister call itself 401s (and once logout finishes,
 * that header and the refresh token are both gone — there's no session left
 * to retry with later, unlike other mutations' offline queue). Retries a
 * couple of times through a genuine "offline right at this instant" blip;
 * doesn't solve a fully offline logout on a shared/borrowed device, which
 * leaves that device registered for this account's pushes until either the
 * same account logs back in and this runs again, or someone else logs into
 * that device (registerForPushNotifications' upsert reassigns the token).
 */
export const unregisterPushNotifications = async (): Promise<void> => {
  if (!isSupported) return;

  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) return;

  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      await api.delete('/users/me/push-token', { data: { token } });
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      return;
    } catch {
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
};

const REST_TIMER_ID = 'rest-timer';

export const scheduleRestTimerNotification = async (seconds: number): Promise<void> => {
  if (!isSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // A fixed identifier + cancel-before-scheduling, same as the training
    // reminder — without it, logging a set before the previous rest period
    // finished (common with short rests) stacks up multiple pending
    // notifications that each fire independently, well after they're relevant.
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_ID,
      content: { title: 'Descanso terminado', body: 'Hora de la siguiente serie' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Best-effort — the visual rest timer already covers this regardless.
  }
};

const TRAINING_REMINDER_ID = 'daily-training-reminder';

/**
 * A local (not server-pushed) reminder for later today, only scheduled when
 * the dashboard finds no workout logged yet today. Re-run on every dashboard
 * load: it re-cancels + reschedules, so it stays in sync without needing any
 * server-side push infrastructure (no token storage, no delivery pipeline).
 */
export const scheduleTrainingReminder = async (): Promise<void> => {
  if (!isSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelScheduledNotificationAsync(TRAINING_REMINDER_ID);

    const target = new Date();
    target.setHours(20, 0, 0, 0);
    const secondsUntilTarget = Math.floor((target.getTime() - Date.now()) / 1000);
    if (secondsUntilTarget <= 0) return;

    await Notifications.scheduleNotificationAsync({
      identifier: TRAINING_REMINDER_ID,
      content: { title: '¿Entrenas hoy?', body: 'Todavía no has registrado ningún entrenamiento hoy.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilTarget },
    });
  } catch {
    // Best-effort.
  }
};

export const cancelRestTimerNotification = async (): Promise<void> => {
  if (!isSupported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_ID);
  } catch {
    // Best-effort.
  }
};

export const cancelTrainingReminder = async (): Promise<void> => {
  if (!isSupported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(TRAINING_REMINDER_ID);
  } catch {
    // Best-effort.
  }
};
