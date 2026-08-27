import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Native: Keystore-backed SecureStore, so tokens aren't sitting in plaintext
 * on disk. Web: AsyncStorage — SecureStore has no web implementation at all.
 *
 * This used to be a blanket switch to AsyncStorage everywhere, because
 * SecureStore's Keystore-encrypted values weren't surviving an Android
 * process restart on at least one real device — the write never threw, but
 * the read after restart did. That's the signature of Android silently
 * invalidating the Keystore encryption key underneath an app (happens after
 * things like a biometric enrollment change or certain OS updates), which
 * throws on decrypt rather than just missing the value. Losing at-rest
 * encryption for every user's tokens to work around a failure mode that only
 * ever needs "log in again" isn't the right trade — instead, getItem treats
 * a SecureStore read failure as "nothing stored" (forces a normal re-login,
 * same as an expired token) and clears the now-unreadable entry so it isn't
 * retried forever.
 */
const isWeb = Platform.OS === 'web';

const readSecure = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    return null;
  }
};

export const storage = {
  getItem: (key: string) => (isWeb ? AsyncStorage.getItem(key) : readSecure(key)),
  setItem: (key: string, value: string) =>
    isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};
