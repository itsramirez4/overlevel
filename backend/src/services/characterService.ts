import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';
import { CHARACTER_TYPES, CharacterType, isCharacterType } from '../config/characterTypes';
import { analyticsService } from './analyticsService';

/** XP for a single workout — reused both to award XP live and to backfill
 * a new character's starting XP from everything already logged. */
function computeWorkoutXp(volume: number, setsCount: number, prCount: number): number {
  return 10 + Math.round(volume / 50) + setsCount * 2 + prCount * 25;
}

/** Cumulative XP needed to REACH a given level — the inverse of levelForXp. */
function xpForLevel(level: number): number {
  return 50 * Math.pow(level - 1, 2);
}

function levelForXp(xp: number): number {
  return Math.floor(1 + Math.sqrt(xp / 50));
}

export class CharacterService {
  getTypes() {
    return CHARACTER_TYPES;
  }

  async getMyCharacter(userId: string) {
    const { data: character, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new AppError('Failed to fetch character');
    if (!character) return null;

    const stats = await this.computeStats(userId);
    const level = levelForXp(character.xp);
    const xpForCurrentLevel = xpForLevel(level);
    const xpForNextLevel = xpForLevel(level + 1);
    const progress = (character.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);

    return {
      ...character,
      level,
      xp_for_current_level: xpForCurrentLevel,
      xp_for_next_level: xpForNextLevel,
      progress: Math.max(0, Math.min(1, progress)),
      stats,
      type_info: CHARACTER_TYPES.find((t) => t.id === character.character_type),
    };
  }

  async create(userId: string, characterType: string) {
    if (!isCharacterType(characterType)) {
      throw new AppError('Invalid character type', 400);
    }

    const { data: existing } = await supabaseAdmin
      .from('characters')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) throw new AppError('Ya tienes un personaje creado', 409);

    const typeDef = CHARACTER_TYPES.find((t) => t.id === characterType)!;
    const startingXp = await this.computeTotalXpFromHistory(userId);

    const { data, error } = await supabaseAdmin
      .from('characters')
      .insert({
        user_id: userId,
        character_type: characterType,
        name: typeDef.name,
        xp: startingXp,
        level: levelForXp(startingXp),
      })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to create character');
    return this.getMyCharacter(userId);
  }

  /** Switch class after creation — level/xp are earned from real training
   * history and stay untouched, only the class (and its display name) changes. */
  async changeType(userId: string, characterType: string) {
    if (!isCharacterType(characterType)) {
      throw new AppError('Invalid character type', 400);
    }

    const { data: existing } = await supabaseAdmin
      .from('characters')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) throw new AppError('No tienes ningún personaje todavía', 404);

    const typeDef = CHARACTER_TYPES.find((t) => t.id === characterType)!;

    const { error } = await supabaseAdmin
      .from('characters')
      .update({ character_type: characterType, name: typeDef.name, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) throw new AppError('Failed to change character type');
    return this.getMyCharacter(userId);
  }

  /** Called when a workout is completed — no-op if the user has no character yet. */
  async awardXpForWorkout(userId: string, workoutId: string): Promise<void> {
    const { data: character } = await supabaseAdmin
      .from('characters')
      .select('id, xp')
      .eq('user_id', userId)
      .maybeSingle();

    if (!character) return;

    const { data: sets } = await supabaseAdmin
      .from('sets')
      .select('weight, reps, is_warmup, is_pr')
      .eq('workout_id', workoutId);

    const nonWarmup = (sets || []).filter((s) => !s.is_warmup);
    const volume = nonWarmup.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const prCount = nonWarmup.filter((s) => s.is_pr).length;
    const xpGained = computeWorkoutXp(volume, nonWarmup.length, prCount);

    const newXp = character.xp + xpGained;
    await supabaseAdmin
      .from('characters')
      .update({ xp: newXp, level: levelForXp(newXp), updated_at: new Date().toISOString() })
      .eq('id', character.id);
  }

  private async computeTotalXpFromHistory(userId: string): Promise<number> {
    const workouts = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from('workouts')
        .select('sets(weight, reps, is_warmup, is_pr)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .range(from, to)
    );

    let totalXp = 0;
    for (const w of workouts) {
      const nonWarmup = (w.sets || []).filter((s: any) => !s.is_warmup);
      const volume = nonWarmup.reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);
      const prCount = nonWarmup.filter((s: any) => s.is_pr).length;
      totalXp += computeWorkoutXp(volume, nonWarmup.length, prCount);
    }
    return totalXp;
  }

  /** Fuerza/Resistencia/Constancia — always derived live from real training
   * data, same as the rest of the app's analytics, never stored/duplicated. */
  private async computeStats(userId: string) {
    const { data: statsRows } = await supabaseAdmin
      .from('user_exercise_stats')
      .select('estimated_1rm, total_volume')
      .eq('user_id', userId);

    const fuerza = Math.round(Math.max(0, ...(statsRows || []).map((r) => r.estimated_1rm || 0)));
    const totalVolume = (statsRows || []).reduce((sum, r) => sum + (r.total_volume || 0), 0);
    const resistencia = Math.round(totalVolume / 500);
    const constancia = await analyticsService.getCurrentStreak(userId);

    return { fuerza, resistencia, constancia };
  }
}

export const characterService = new CharacterService();
