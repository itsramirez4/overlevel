import { Appearance } from 'react-native';
import { getThemePreference } from '../services/themeStorage';

// Navy-tinted dark scale rooted on the brand's Dark Background (#0A0E27),
// stepped up in lightness the same way the previous neutral scale was.
const darkColors = {
  bg: {
    primary: '#0A0E27',
    secondary: '#141A3A',
    tertiary: '#1F2749',
    surface: '#191F3F',
    elevated: '#262E52',
  },
  // border/text.muted/fire/error were lightened just enough to clear WCAG
  // AA (4.5:1 text, 3:1 UI components) against every bg.* shade they
  // actually appear on — the originals ranged 1.06–3.13:1, i.e. borders
  // that were nearly invisible and muted text that failed AA everywhere.
  border: {
    subtle: '#7b7b7f',
    default: '#83838a',
  },
  text: {
    primary: '#f5f5f7',
    secondary: '#9b9ba3',
    muted: '#9999a0',
    // Text that sits directly on a solid accent.* surface (a primary
    // button, a selected chip) — deliberately the SAME fixed light value
    // in both themes, since a saturated brand-red/gold surface always
    // wants light text regardless of whether the rest of the app is
    // currently light or dark.
    onAccent: '#f5f5f7',
  },
  // Overlevel Red — brand palette (LOGO-GUIDELINES.md). Gold marks
  // progression (XP/level fills), red is the primary CTA accent.
  accent: {
    fire: '#FF5A4A',
    fireDim: '#C23A2D',
    fireGlow: 'rgba(255, 90, 74, 0.35)',
    ember: '#ff8a3d',
    gold: '#FFD700',
    goldGlow: 'rgba(255, 215, 0, 0.35)',
  },
  semantic: {
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ff6b6b',
  },
};

// Same brand identity, same token shape, remapped onto a light surface
// scale (primary..elevated running dim-to-white, mirroring the dark
// scale's dim-to-bright progression) — chosen the same way the dark
// palette's own comment describes: picked, then darkened/lightened
// against every bg.* shade with the actual contrast formula (see
// theme.test.ts) until each cleared 4.5:1 (text) / 3:1 (borders), not by
// eye. accent.fire/gold are held to that same bar for their "used as
// text directly on bg.*" role; their "solid button/chip background" role
// is covered by text.onAccent instead, same as the dark theme already
// relies on a fixed light text color there.
const lightColors = {
  bg: {
    primary: '#EEF0F5',
    secondary: '#F5F6FA',
    tertiary: '#FAFBFD',
    surface: '#F8F9FC',
    elevated: '#FFFFFF',
  },
  border: {
    subtle: '#83838F',
    default: '#767986',
  },
  text: {
    primary: '#14171F',
    secondary: '#5C5F6B',
    muted: '#666975',
    onAccent: '#FFFFFF',
  },
  accent: {
    fire: '#CC3A28',
    fireDim: '#A82E1F',
    fireGlow: 'rgba(204, 58, 40, 0.35)',
    ember: '#C2540E',
    gold: '#8A6D00',
    goldGlow: 'rgba(138, 109, 0, 0.35)',
  },
  semantic: {
    success: '#1F9D5C',
    warning: '#A9720A',
    error: '#B8291D',
  },
};

/**
 * Resolved once, synchronously, at module load — every screen imports
 * `colors` and bakes it into a module-level StyleSheet.create() at import
 * time, not per-render, so there is no live "theme changes, screens
 * re-render with new colors" path short of reloading the whole JS bundle.
 * Changing the preference (see themeStorage) takes effect on the next
 * reload — profile/settings.tsx triggers one immediately via
 * Updates.reloadAsync() after saving a new choice.
 */
function resolveScheme(): 'light' | 'dark' {
  const preference = getThemePreference();
  if (preference === 'light' || preference === 'dark') return preference;
  // 'system', or nothing saved yet — Appearance.getColorScheme() can
  // return null (unknown) on some platforms/simulators; this app has
  // always been dark-only until now, so that's the sensible default.
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

export const activeTheme: 'light' | 'dark' = resolveScheme();
export const colors = activeTheme === 'light' ? lightColors : darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.4 },
  small: { fontSize: 14, fontWeight: '400' as const },
  tiny: { fontSize: 12, fontWeight: '500' as const },
};

export const shadow = {
  card: {
    shadowColor: colors.accent.fire,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  glow: {
    shadowColor: colors.accent.fire,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Exported for theme.test.ts, which validates BOTH palettes' contrast
// regardless of which one `colors` above resolved to in the test process.
export const themes = { light: lightColors, dark: darkColors };
