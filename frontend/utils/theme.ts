export const colors = {
  bg: {
    primary: '#0a0a0b',
    secondary: '#161618',
    tertiary: '#232326',
    surface: '#1c1c1f',
    elevated: '#28282c',
  },
  border: {
    subtle: '#2c2c30',
    default: '#3a3a3f',
  },
  text: {
    primary: '#f5f5f7',
    secondary: '#9b9ba3',
    muted: '#5f5f68',
  },
  accent: {
    fire: '#ff4433',
    fireDim: '#c22c1f',
    fireGlow: 'rgba(255, 68, 51, 0.35)',
    ember: '#ff8a3d',
  },
  semantic: {
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ff4433',
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
  md: 10,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
