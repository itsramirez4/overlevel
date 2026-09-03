import { MMKV } from 'react-native-mmkv';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme_preference';

// theme.ts reads this synchronously at module-evaluation time, before any
// screen's own StyleSheet.create runs — every screen bakes `colors` into
// its stylesheet once, at import, not per-render. AsyncStorage can't
// satisfy that (its read is async, and module evaluation can't be paused
// to await one); MMKV's synchronous API is what makes "the saved
// preference is already known by the time colors.ts resolves" possible at
// all, without rewriting how every screen defines its styles.
const storage = new MMKV({ id: 'overlevel-theme' });

export function getThemePreference(): ThemePreference {
  const value = storage.getString(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function setThemePreference(preference: ThemePreference): void {
  storage.set(THEME_KEY, preference);
}
