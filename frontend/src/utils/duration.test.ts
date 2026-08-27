import { formatDuration, formatSetDuration, formatPace } from './duration';

describe('formatDuration', () => {
  it('shows just minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('shows just hours on an exact multiple of 60', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('shows hours and minutes together', () => {
    expect(formatDuration(95)).toBe('1h 35min');
  });

  it('handles zero minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
  });
});

describe('formatSetDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatSetDuration(1925)).toBe('32:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatSetDuration(65)).toBe('1:05');
  });
});

describe('formatPace', () => {
  it('formats a pace as min:ss /km by default', () => {
    expect(formatPace(5.5)).toBe('5:30 /km');
  });

  it('uses the given unit label', () => {
    expect(formatPace(8.05, 'mi')).toBe('8:03 /mi');
  });

  it('shows a dash for a missing pace', () => {
    expect(formatPace(null)).toBe('—');
    expect(formatPace(undefined)).toBe('—');
  });
});
