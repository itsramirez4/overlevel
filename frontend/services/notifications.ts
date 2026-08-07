import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// expo-notifications has no real web implementation — scheduling/permission
// calls there are either no-ops or throw, so skip it outright rather than
// depend on every call site remembering to catch.
const isSupported = Platform.OS !== 'web';

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!isSupported) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
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
