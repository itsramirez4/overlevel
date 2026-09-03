import { themes } from './theme';

// WCAG 2.1 AA — https://www.w3.org/TR/WCAG21/#contrast-minimum (1.4.3) and
// #non-text-contrast (1.4.11). Guards against a future palette tweak
// silently reintroducing text/borders that are unreadable to low-vision
// users — the original dark palette measured 1.06–3.13:1 where AA requires
// 4.5:1 for text and 3:1 for UI component boundaries. Runs against BOTH
// themes/theme.ts palettes, not just whichever one `colors` resolved to in
// this test process — a light-mode-only regression would otherwise pass
// silently whenever tests happen to run under the dark default.
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hexToRgb(hex1));
  const L2 = relativeLuminance(hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(Object.entries(themes))('theme contrast (WCAG AA) — %s', (_themeName, colors) => {
  const backgrounds = Object.entries(colors.bg);

  it.each(backgrounds)('text.primary passes 4.5:1 on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.text.primary, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backgrounds)('text.secondary passes 4.5:1 on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.text.secondary, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backgrounds)('text.muted passes 4.5:1 on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.text.muted, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backgrounds)('semantic.error text passes 4.5:1 on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.semantic.error, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backgrounds)('border.default passes 3:1 (non-text) on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.border.default, bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(backgrounds)('border.subtle passes 3:1 (non-text) on bg.%s', (_name, bg) => {
    expect(contrastRatio(colors.border.subtle, bg)).toBeGreaterThanOrEqual(3);
  });

  // The dark theme's own accent.fire/gold were never held to this bar (its
  // real, already-shipped baseline is ~2.83:1 — a call made before this
  // palette work existed, not something to silently "fix" here as a side
  // effect of adding a light theme). The light palette is new, so it's
  // held to the real 4.5:1 this time.
  if (_themeName === 'light') {
    it('text.onAccent passes 4.5:1 on both accent.fire and accent.gold — the fixed button-label color', () => {
      expect(contrastRatio(colors.text.onAccent, colors.accent.fire)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.text.onAccent, colors.accent.gold)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
