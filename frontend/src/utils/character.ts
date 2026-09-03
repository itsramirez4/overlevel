import { Character } from '../types';

/** "X / Y XP" — progress within the current level, not total XP earned. */
export const getXpProgressLabel = (character: Character): string =>
  `${character.xp - character.xp_for_current_level} / ${character.xp_for_next_level - character.xp_for_current_level} XP`;

/**
 * Display string for one of the three character stats, with its unit —
 * fuerza is an estimated 1RM (kg), constancia a streak (days), resistencia
 * a unitless volume score. Centralized so the dashboard banner, the full
 * character sheet, and a public profile card can't drift on formatting.
 */
export const formatCharacterStat = (stat: keyof Character['stats'], value: number): string => {
  if (stat === 'fuerza') return `${value}kg`;
  if (stat === 'constancia') return `${value}d`;
  return `${value}`;
};
