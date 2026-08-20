import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Used to be SecureStore (Keystore-backed) on native with an AsyncStorage
 * fallback on web only. Switched to AsyncStorage everywhere: SecureStore's
 * Keystore-encrypted values weren't surviving an Android process restart on
 * at least one real device (session lost on every backgrounding, not just
 * force-close — see the app/close bug), while the write itself never threw.
 * AsyncStorage trades at-rest encryption for plain reliable persistence,
 * an acceptable tradeoff for short-lived JWTs in a single-user fitness app.
 */
export const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
