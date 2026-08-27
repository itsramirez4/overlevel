export const colors = {
  // Navy-tinted dark scale rooted on the brand's Dark Background (#0A0E27),
  // stepped up in lightness the same way the previous neutral scale was.
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
  // The navy bg.* swap raised bg.tertiary/elevated's luminance just enough
  // that text.muted/border.subtle dropped back below AA against those two
  // (theme.test.ts caught it) — relightened here, verified against all 5
  // bg.* shades again.
  border: {
    subtle: '#7b7b7f',
    default: '#83838a',
  },
  text: {
    primary: '#f5f5f7',
    secondary: '#9b9ba3',
    muted: '#9999a0',
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
