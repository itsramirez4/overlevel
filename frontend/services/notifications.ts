import * as Notifications from 'expo-notifications';

export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleRestTimerNotification = async (seconds: number) => {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Descanso terminado', body: 'Hora de la siguiente serie' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
};
