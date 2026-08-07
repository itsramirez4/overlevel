import { parse } from 'csv-parse/sync';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { fetchAllRows } from '../utils/pagination';

// Hevy's date format uses the abbreviation for whatever language the app was
// set to when the export was made — support English and Spanish.
const MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Hevy exports "10 Jun 2024, 08:15" (or "4 ago 2026, 17:18" in Spanish) alongside occasional ISO timestamps. */
function parseHevyDate(raw: string): Date | null {
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}) (\w{3}) (\d{4}),\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const monthAbbr = match[2].toLowerCase();
    const enIndex = MONTHS_EN.indexOf(monthAbbr);
    const monthIndex = enIndex >= 0 ? enIndex : MONTHS_ES.indexOf(monthAbbr);
    if (monthIndex >= 0) {
      const d = new Date(Number(match[3]), monthIndex, Number(match[1]), Number(match[4]), Number(match[5]));
      if (!isNaN(d.getTime())) return d;
    }
  }

  const iso = new Date(raw);
  return isNaN(iso.getTime()) ? null : iso;
}

const LBS_TO_KG = 1 / 2.20462;

export interface HevyImportResult {
  workouts_created: number;
  exercises_created: number;
  sets_created: number;
  rows_skipped: number;
  duplicate_workouts_skipped: number;
}

export class ImportService {
  async importHevyCsv(userId: string, csvText: string): Promise<HevyImportResult> {
    let rows: Record<string, string>[];
    try {
      rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        relax_quotes: true,
      });
    } catch (err: any) {
      throw new AppError(`El archivo no es un CSV válido (${err?.message || 'error desconocido'})`, 400);
    }

    if (rows.length === 0) throw new AppError('El CSV no tiene filas', 400);

    const result: HevyImportResult = {
      workouts_created: 0,
      exercises_created: 0,
      sets_created: 0,
      rows_skipped: 0,
      duplicate_workouts_skipped: 0,
    };

    // Hevy's export lists sets one per row, in order, with every set of a
    // workout sharing the same start_time — so contiguous same-start_time
    // rows are one workout. Sorted oldest-first so PR detection sees history
    // in the same order it would have happened live.
    const groups: { startedAt: Date; rows: Record<string, string>[] }[] = [];
    for (const row of rows) {
      const startedAt = parseHevyDate(row.start_time);
      if (!startedAt) {
        result.rows_skipped++;
        continue;
      }
      const last = groups[groups.length - 1];
      if (last && last.startedAt.getTime() === startedAt.getTime()) last.rows.push(row);
      else groups.push({ startedAt, rows: [row] });
    }
    groups.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    // Every row failed to parse a date (e.g. an export made in a locale
    // parseHevyDate doesn't recognize) — without this, the endpoint would
    // return a "successful" import with everything at 0 and no indication
    // the whole file was unreadable.
    if (groups.length === 0) {
      throw new AppError('No se pudo leer ninguna fecha del CSV. ¿Es un export de Hevy válido?', 400);
    }

    const existing = await fetchAllRows<{ id: string; name: string }>((from, to) =>
      supabaseAdmin.from('exercises').select('id, name').eq('user_id', userId).range(from, to)
    );
    const exerciseIdByName = new Map(existing.map((e) => [e.name.toLowerCase(), e.id]));

    // A previous (or concurrently-running) import of the same file would
    // otherwise create exact duplicates — same user, same started_at — so
    // skip any workout whose start time we've already recorded.
    const existingWorkouts = await fetchAllRows<{ started_at: string }>((from, to) =>
      supabaseAdmin.from('workouts').select('started_at').eq('user_id', userId).range(from, to)
    );
    const existingStartTimes = new Set(existingWorkouts.map((w) => new Date(w.started_at).getTime()));

    // Seeds is_pr detection with each exercise's current best (weight, then
    // reps) so the whole import doesn't need a per-row DB round trip —
    // rows are already processed oldest-first, so walking forward in memory
    // and updating this map after each set gives the exact same result
    // computeSetIsPr would, just without thousands of sequential queries.
    const existingSets = await fetchAllRows<{ exercise_id: string; weight: number; reps: number }>((from, to) =>
      supabaseAdmin
        .from('sets')
        .select('exercise_id, weight, reps, workouts!inner(user_id)')
        .eq('workouts.user_id', userId)
        .eq('is_warmup', false)
        .range(from, to)
    );
    const bestByExercise = new Map<string, { weight: number; reps: number }>();
    for (const s of existingSets) {
      const best = bestByExercise.get(s.exercise_id);
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
        bestByExercise.set(s.exercise_id, { weight: s.weight, reps: s.reps });
      }
    }

    for (const group of groups) {
      if (existingStartTimes.has(group.startedAt.getTime())) {
        result.duplicate_workouts_skipped++;
        continue;
      }
      existingStartTimes.add(group.startedAt.getTime());

      const first = group.rows[0];
      const completedAt = parseHevyDate(first.end_time) || group.startedAt;
      const durationMinutes = Math.round((completedAt.getTime() - group.startedAt.getTime()) / 60000);

      const { data: workout, error: workoutError } = await supabaseAdmin
        .from('workouts')
        .insert({
          user_id: userId,
          started_at: group.startedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          duration_minutes: durationMinutes,
          title: first.title || undefined,
          notes: first.description || undefined,
        })
        .select()
        .single();

      if (workoutError || !workout) {
        // 23505 = unique_violation on (user_id, started_at) — another request
        // (e.g. a concurrent double-submit of this same import) already
        // inserted this workout between our in-memory check above and this
        // insert, so it's a duplicate, not a real failure.
        if (workoutError?.code === '23505') {
          result.duplicate_workouts_skipped++;
        } else {
          result.rows_skipped += group.rows.length;
        }
        continue;
      }
      result.workouts_created++;

      const setNumberByExercise = new Map<string, number>();

      for (const row of group.rows) {
        const exerciseName = (row.exercise_title || '').trim();
        if (!exerciseName) {
          result.rows_skipped++;
          continue;
        }

        const nameKey = exerciseName.toLowerCase();
        let exerciseId = exerciseIdByName.get(nameKey);
        if (!exerciseId) {
          const looksLikeCardio = !!(row.distance_km || row.distance_miles || row.duration_seconds) && !row.weight_kg && !row.weight_lbs;
          const { data: newExercise, error: exerciseError } = await supabaseAdmin
            .from('exercises')
            .insert({ user_id: userId, name: exerciseName, category: looksLikeCardio ? 'cardio' : 'compound' })
            .select()
            .single();

          if (newExercise?.id) {
            exerciseId = newExercise.id as string;
            exerciseIdByName.set(nameKey, exerciseId);
            result.exercises_created++;
          } else if (exerciseError?.code === '23505') {
            // Another row earlier in this same CSV (or a concurrent import)
            // already created this exercise — recover by looking it up
            // instead of dropping every remaining row for it.
            const { data: raced } = await supabaseAdmin
              .from('exercises')
              .select('id')
              .eq('user_id', userId)
              .eq('name', exerciseName)
              .maybeSingle();
            if (raced?.id) {
              exerciseId = raced.id;
              exerciseIdByName.set(nameKey, raced.id);
            }
          }
        }

        if (!exerciseId) {
          result.rows_skipped++;
          continue;
        }

        const weightKg = row.weight_kg
          ? parseFloat(row.weight_kg)
          : row.weight_lbs
            ? parseFloat(row.weight_lbs) * LBS_TO_KG
            : null;
        const reps = row.reps ? parseInt(row.reps, 10) : null;

        // Our schema requires weight + reps per set, so distance/duration-only
        // cardio rows (no load logged) can't be represented — skip them.
        // Explicit null checks (not falsy checks) so a genuine 0kg
        // bodyweight set (pull-ups, dips…) isn't treated as missing data.
        if (weightKg == null || !Number.isFinite(weightKg) || !reps) {
          result.rows_skipped++;
          continue;
        }

        const isWarmup = row.set_type === 'warmup';
        const setNumber = (setNumberByExercise.get(exerciseId) || 0) + 1;
        setNumberByExercise.set(exerciseId, setNumber);

        const weight = Math.round(weightKg * 100) / 100;

        let isPr = false;
        if (!isWarmup) {
          const best = bestByExercise.get(exerciseId);
          isPr = !best || weight > best.weight || (weight === best.weight && reps > best.reps);
          if (isPr) bestByExercise.set(exerciseId, { weight, reps });
        }

        // A rider out-of-range RPE (e.g. a literal 0) would otherwise trip
        // the sets.rpe CHECK constraint and silently drop the whole set,
        // not just the RPE value — clamp to "missing" instead.
        const parsedRpe = row.rpe ? Math.round(parseFloat(row.rpe)) : NaN;
        const rpe = parsedRpe >= 1 && parsedRpe <= 10 ? parsedRpe : undefined;

        const { error: setError } = await supabaseAdmin.from('sets').insert({
          workout_id: workout.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          reps,
          weight,
          rpe,
          form_notes: row.exercise_notes || undefined,
          is_warmup: isWarmup,
          is_pr: isPr,
          superset_group: row.superset_id ? `${workout.id}-${row.superset_id}` : undefined,
        });

        if (setError) result.rows_skipped++;
        else result.sets_created++;
      }
    }

    return result;
  }
}

export const importService = new ImportService();
