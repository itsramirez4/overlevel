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

export const scheduleRestTimerNotification = async (seconds: number): Promise<void> => {
  if (!isSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso terminado', body: 'Hora de la siguiente serie' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    // Best-effort — the visual rest timer already covers this regardless.
  }
};
