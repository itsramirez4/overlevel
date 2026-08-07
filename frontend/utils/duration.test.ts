import { formatDuration } from './duration';

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
