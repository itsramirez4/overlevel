import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

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
