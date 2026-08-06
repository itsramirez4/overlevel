import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

const HP_MAX = 100;
// A set with no exercise history yet is judged against this baseline
// instead — otherwise the very first time you ever log an exercise, the
// "reference" would be that same set (ratio 1), always landing the same
// fixed hit regardless of how hard the set actually was.
const DEFAULT_REFERENCE_VOLUME_PER_SET = 500;

export interface ExerciseBattle {
  id: string;
  workout_id: string;
  exercise_id: string;
  user_id: string;
  hp_max: number;
  hp_current: number;
  defeated: boolean;
  defeated_at: string | null;
}

export interface BestiaryEntry {
  exercise_id: string;
  exercise_name: string;
  category: string;
  times_defeated: number;
  first_defeated_at: string;
  last_defeated_at: string;
}

export class BattleService {
  async getForWorkout(workoutId: string, userId: string): Promise<ExerciseBattle[]> {
    const { data, error } = await supabaseAdmin
      .from('exercise_battles')
      .select('*')
      .eq('workout_id', workoutId)
      .eq('user_id', userId);

    if (error) throw new AppError('Failed to fetch battles');
    return (data || []) as ExerciseBattle[];
  }

  /**
   * Trophy list — every exercise ever defeated, with how many times and
   * when. Reuses the one-way `defeated` ratchet already guaranteed by
   * finishForWorkout(), so a kill recorded here never gets un-recorded by
   * later editing/deleting sets from that workout.
   */
  async getBestiary(userId: string): Promise<BestiaryEntry[]> {
    const battles = await fetchAllRows<{ exercise_id: string; defeated_at: string | null }>((from, to) =>
      supabaseAdmin
        .from('exercise_battles')
        .select('exercise_id, defeated_at')
        .eq('user_id', userId)
        .eq('defeated', true)
        .range(from, to)
    );

    if (battles.length === 0) return [];

    const byExercise = new Map<string, { count: number; first: string; last: string }>();
    for (const b of battles) {
      const defeatedAt = b.defeated_at || new Date(0).toISOString();
      const existing = byExercise.get(b.exercise_id);
      if (!existing) {
        byExercise.set(b.exercise_id, { count: 1, first: defeatedAt, last: defeatedAt });
      } else {
        existing.count += 1;
        if (defeatedAt < existing.first) existing.first = defeatedAt;
        if (defeatedAt > existing.last) existing.last = defeatedAt;
      }
    }

    const exerciseIds = [...byExercise.keys()];
    const { data: exercises, error } = await supabaseAdmin
      .from('exercises')
      .select('id, name, category')
      .in('id', exerciseIds);

    if (error) throw new AppError('Failed to fetch exercises for bestiary');

    const exerciseById = new Map((exercises || []).map((e) => [e.id, e]));

    return exerciseIds
      .map((exerciseId) => {
        const agg = byExercise.get(exerciseId)!;
        const exercise = exerciseById.get(exerciseId);
        return {
          exercise_id: exerciseId,
          exercise_name: exercise?.name || 'Ejercicio eliminado',
          category: exercise?.category || 'compound',
          times_defeated: agg.count,
          first_defeated_at: agg.first,
          last_defeated_at: agg.last,
        };
      })
      .sort((a, b) => b.times_defeated - a.times_defeated);
  }

  /**
   * Called for every non-warmup set logged. Damage is a one-way ratchet —
   * it's never recalculated or reversed by editing/deleting sets afterward,
   * same as a real hit landed can't be un-landed. How much damage lands is
   * mostly flavor; the actual "you WILL kill this enemy" guarantee lives in
   * finishForWorkout(), not here.
   */
  async applyDamage(
    workoutId: string,
    exerciseId: string,
    userId: string,
    weight: number,
    reps: number
  ): Promise<ExerciseBattle> {
    let battle = await this.getOrCreate(workoutId, exerciseId, userId);
    if (battle.defeated) return battle;

    const { data: stats } = await supabaseAdmin
      .from('user_exercise_stats')
      .select('total_volume, set_count')
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId)
      .maybeSingle();

    const referenceVolumePerSet =
      stats?.set_count && stats.set_count > 0
        ? (stats.total_volume as number) / (stats.set_count as number)
        : DEFAULT_REFERENCE_VOLUME_PER_SET;

    const thisSetVolume = weight * reps;
    // A set matching your usual effort for this exercise does ~1/4 of the
    // bar; a noticeably harder-than-usual set does more.
    const damage = Math.max(1, Math.round((thisSetVolume / referenceVolumePerSet) * (battle.hp_max / 4)));

    const nextHp = Math.max(0, battle.hp_current - damage);
    const defeated = nextHp === 0;

    const { data: updated, error } = await supabaseAdmin
      .from('exercise_battles')
      .update({
        hp_current: nextHp,
        defeated,
        defeated_at: defeated ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', battle.id)
      .select()
      .single();

    if (error || !updated) throw new AppError('Failed to apply damage');
    return updated as ExerciseBattle;
  }

  /**
   * The guarantee: however much real damage landed, completing the workout
   * finishes off every battle it touched. No combination of sets/reps can
   * leave an enemy alive past the end of the workout, and — since this only
   * ever flips defeated false→true, never the reverse — a set deleted
   * afterward can't undo a kill already recorded here.
   */
  async finishForWorkout(workoutId: string, userId: string): Promise<void> {
    await supabaseAdmin
      .from('exercise_battles')
      .update({
        hp_current: 0,
        defeated: true,
        defeated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('workout_id', workoutId)
      .eq('user_id', userId)
      .eq('defeated', false);
  }

  private async getOrCreate(workoutId: string, exerciseId: string, userId: string): Promise<ExerciseBattle> {
    const { data: existing } = await supabaseAdmin
      .from('exercise_battles')
      .select('*')
      .eq('workout_id', workoutId)
      .eq('exercise_id', exerciseId)
      .maybeSingle();

    if (existing) return existing as ExerciseBattle;

    const { data: created, error } = await supabaseAdmin
      .from('exercise_battles')
      .insert({ workout_id: workoutId, exercise_id: exerciseId, user_id: userId, hp_max: HP_MAX, hp_current: HP_MAX })
      .select()
      .single();

    // A concurrent request may have created it between our check and insert
    // (unique constraint on workout_id+exercise_id) — fetch it instead of failing.
    if (error?.code === '23505') {
      const { data: raced } = await supabaseAdmin
        .from('exercise_battles')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('exercise_id', exerciseId)
        .single();
      if (raced) return raced as ExerciseBattle;
    }

    if (error || !created) throw new AppError('Failed to start battle');
    return created as ExerciseBattle;
  }
}

export const battleService = new BattleService();
