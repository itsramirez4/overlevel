import * as Haptics from 'expo-haptics';

// expo-haptics no-ops safely on web, but a device with haptics disabled or
// some Android hardware can still throw — never let feedback crash the
// actual action it's celebrating.
const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

/** A set was logged successfully — the single most frequent interaction in the app. */
export const hapticSetLogged = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** That set was a new PR. */
export const hapticPr = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** The workout was completed. */
export const hapticWorkoutComplete = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
