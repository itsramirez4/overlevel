import { formatCharacterStat, getXpProgressLabel } from './character';
import { Character } from '../types';

const baseCharacter: Character = {
  id: 'c1',
  user_id: 'u1',
  character_type: 'powerlifter',
  name: 'Test',
  level: 3,
  xp: 250,
  xp_for_current_level: 200,
  xp_for_next_level: 350,
  progress: 0.33,
  stats: { fuerza: 100, resistencia: 42, constancia: 7 },
  created_at: '2026-01-01T00:00:00Z',
};

describe('getXpProgressLabel', () => {
  it('shows progress within the current level, not total XP earned', () => {
    expect(getXpProgressLabel(baseCharacter)).toBe('50 / 150 XP');
  });
});

describe('formatCharacterStat', () => {
  it('appends kg to fuerza', () => {
    expect(formatCharacterStat('fuerza', 100)).toBe('100kg');
  });

  it('appends d to constancia', () => {
    expect(formatCharacterStat('constancia', 7)).toBe('7d');
  });

  it('leaves resistencia unitless', () => {
    expect(formatCharacterStat('resistencia', 42)).toBe('42');
  });
});
