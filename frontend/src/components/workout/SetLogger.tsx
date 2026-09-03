import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';
import { enqueueOfflineMutation } from '../../hooks/useOfflineSync';
import { workoutStore } from '../../stores/workoutStore';
import { authStore } from '../../stores/authStore';
import { scheduleRestTimerNotification } from '../../services/notifications';
import { kgToUnit, unitToKg, kmToUnit, unitToKm, DistanceUnit } from '../../utils/units';
import { WeightUnit } from '../../services/calculations';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { UnitToggle } from './UnitToggle';
import { Exercise, Set } from '../../types';
import { getErrorMessage, hasServerResponse } from '../../utils/errors';

export interface SetLoggerProps {
  workoutId: string;
  exercise: Exercise;
  setNumber: number;
  onSetLogged: () => void;
  previousSet?: Set;
  supersetGroup?: string;
  shouldRest?: boolean;
}

export const SetLogger = ({
  workoutId,
  exercise,
  setNumber,
  onSetLogged,
  previousSet,
  supersetGroup,
  shouldRest = true,
}: SetLoggerProps) => {
  const globalUnit = authStore((s) => s.user?.weight_unit) || 'kg';
  const globalDistanceUnit = authStore((s) => s.user?.distance_unit) || 'km';
  // Per-exercise override, changeable any time via the unit chip below —
  // falls back to the user's global preference until one is set.
  const unit: WeightUnit = exercise?.weight_unit || globalUnit;
  const distanceUnit: DistanceUnit = exercise?.distance_unit || globalDistanceUnit;
  const isCardio = exercise?.category === 'cardio';
  const [reps, setReps] = useState(previousSet?.reps?.toString() || '');
  const [weight, setWeight] = useState(
    previousSet?.weight != null ? kgToUnit(previousSet.weight, unit).toString() : ''
  );
  const [minutes, setMinutes] = useState(
    previousSet?.duration_seconds != null ? (previousSet.duration_seconds / 60).toString() : ''
  );
  const [distance, setDistance] = useState(
    previousSet?.distance_km != null ? kmToUnit(previousSet.distance_km, distanceUnit).toString() : ''
  );
  const [rpe, setRpe] = useState(previousSet?.rpe?.toString() || '');
  const [rest, setRest] = useState(previousSet?.rest_seconds?.toString() || '90');
  const [tempo, setTempo] = useState(previousSet?.tempo || '');
  const [formNotes, setFormNotes] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queuedOffline, setQueuedOffline] = useState(false);

  // This component instance stays mounted across the whole exercise (same
  // key), so a stale "Sin conexión" banner from a previous set would
  // otherwise never clear on its own. `setNumber` only advances once the
  // parent's set list actually grew — either useOfflineSync's flush landed
  // (see its query invalidation) or the offline set was never really
  // pending in the first place — either way that's the signal to drop it.
  useEffect(() => {
    setQueuedOffline(false);
  }, [setNumber]);

  // Persists the new per-exercise unit (fire-and-forget — a failed save just
  // means it falls back to the global unit next time, not worth blocking on)
  // and updates the shared session-exercise state so every other screen
  // showing this exercise (logged-set rows, "last session") picks it up too.
  const persistUnit = (patch: { weight_unit: WeightUnit } | { distance_unit: DistanceUnit }) => {
    workoutStore.getState().updateSessionExercise(exercise.id, patch);
    api.put(`/exercises/${exercise.id}`, patch).catch(() => {});
  };

  const handleToggleWeightUnit = () => {
    const nextUnit: WeightUnit = unit === 'kg' ? 'lbs' : 'kg';
    const parsed = parseFloat(weight);
    if (Number.isFinite(parsed)) setWeight(kgToUnit(unitToKg(parsed, unit), nextUnit).toString());
    persistUnit({ weight_unit: nextUnit });
  };

  const handleToggleDistanceUnit = () => {
    const nextUnit: DistanceUnit = distanceUnit === 'km' ? 'mi' : 'km';
    const parsed = parseFloat(distance);
    if (Number.isFinite(parsed)) setDistance(kmToUnit(unitToKm(parsed, distanceUnit), nextUnit).toString());
    persistUnit({ distance_unit: nextUnit });
  };

  const handleSubmit = async () => {
    let cardioPayload: { duration_seconds: number; distance_km: number } | undefined;
    let strengthPayload: { reps: number; weight: number } | undefined;

    if (isCardio) {
      const parsedMinutes = parseFloat(minutes);
      const parsedDistance = parseFloat(distance);
      // < 0, not <= 0: 0 distance (stationary/no-distance cardio) and 0
      // duration are both real values someone might log.
      if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0 || !Number.isFinite(parsedDistance) || parsedDistance < 0) {
        setError('Tiempo y distancia no pueden ser negativos');
        return;
      }
      cardioPayload = {
        duration_seconds: Math.round(parsedMinutes * 60),
        distance_km: unitToKm(parsedDistance, distanceUnit),
      };
    } else {
      const parsedReps = parseInt(reps, 10);
      const parsedWeight = parseFloat(weight);
      // < 0, not <= 0: 0 reps (a failed attempt) and 0 weight (bodyweight
      // work, an unloaded bar) are both real sets someone might log.
      if (!Number.isFinite(parsedReps) || parsedReps < 0 || !Number.isFinite(parsedWeight) || parsedWeight < 0) {
        setError('Reps y peso no pueden ser negativos');
        return;
      }
      strengthPayload = { reps: parsedReps, weight: unitToKg(parsedWeight, unit) };
    }

    setError('');
    setQueuedOffline(false);
    setLoading(true);

    const payload = {
      workout_id: workoutId,
      exercise_id: exercise.id,
      set_number: setNumber,
      ...strengthPayload,
      ...cardioPayload,
      rpe: rpe ? parseInt(rpe) : undefined,
      rest_seconds: rest ? parseInt(rest) : undefined,
      tempo: tempo || undefined,
      form_notes: formNotes || undefined,
      is_warmup: isWarmup,
      superset_group: supersetGroup,
    };

    // Resetting the form and starting the rest timer don't need the server's
    // response — only the button stays disabled (via `loading`) while the
    // request is in flight, instead of the whole set costing a round trip
    // before the user can move on to resting/the next set.
    setFormNotes('');
    setIsWarmup(false);

    const restSeconds = rest ? parseInt(rest) : 0;
    if (shouldRest && restSeconds > 0) {
      workoutStore.getState().startRest(restSeconds);
      scheduleRestTimerNotification(restSeconds);
    }

    try {
      await api.post('/sets', payload);
      onSetLogged();
    } catch (err) {
      if (!hasServerResponse(err)) {
        // No response at all means the request never reached the server
        // (no signal — common enough in a gym) rather than the server
        // rejecting it. Queue it instead of just failing: useOfflineSync
        // (mounted at the app root) flushes it automatically the moment
        // connectivity returns.
        await enqueueOfflineMutation('/sets', payload);
        setQueuedOffline(true);
      } else {
        setError(getErrorMessage(err, 'No se pudo registrar la serie'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.setBadge}>
          <Text style={styles.setBadgeText}>{setNumber}</Text>
        </View>
        {isCardio ? (
          <>
            <View style={styles.half}>
              <Input
                placeholder="Minutos"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <UnitToggle label={distanceUnit} onPress={handleToggleDistanceUnit} />
              <Input
                placeholder={distanceUnit === 'mi' ? 'Millas' : 'Km'}
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.half}>
              <UnitToggle label={unit} onPress={handleToggleWeightUnit} />
              <Input
                placeholder={unit === 'lbs' ? 'Lbs' : 'Kg'}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Input
                placeholder="Reps"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
              />
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={() => setIsWarmup((v) => !v)}
        style={[styles.warmupChip, isWarmup && styles.warmupChipSelected]}
        activeOpacity={0.7}
      >
        <Text style={[styles.warmupChipText, isWarmup && styles.warmupChipTextSelected]}>
          {isWarmup ? '✓ Calentamiento' : 'Marcar como calentamiento'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowAdvanced((v) => !v)} style={styles.advancedToggle}>
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? 'Ocultar detalles' : 'RPE, descanso, tempo…'}
        </Text>
      </TouchableOpacity>

      {showAdvanced && (
        <>
          <View style={styles.row}>
            <View style={styles.third}>
              <Input label="RPE" placeholder="8" value={rpe} onChangeText={setRpe} keyboardType="number-pad" />
            </View>
            <View style={styles.third}>
              <Input
                label="Descanso (s)"
                placeholder="180"
                value={rest}
                onChangeText={setRest}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.third}>
              <Input label="Tempo" placeholder="2-1-3" value={tempo} onChangeText={setTempo} />
            </View>
          </View>

          <Input
            label="Notas de forma (opcional)"
            placeholder="Cómo se sintió la serie…"
            value={formNotes}
            onChangeText={setFormNotes}
            multiline
            style={styles.notesInput}
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {queuedOffline ? (
        <Text style={styles.offlineNotice}>Sin conexión — se guardó y se sincronizará solo</Text>
      ) : null}

      <Button label={loading ? 'Guardando…' : 'REGISTRAR SERIE'} loading={loading} onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '800',
  },
  half: {
    flex: 1,
  },
  third: {
    flex: 1,
  },
  warmupChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  warmupChipSelected: {
    borderColor: colors.accent.ember,
    backgroundColor: `${colors.accent.ember}1a`,
  },
  warmupChipText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  warmupChipTextSelected: {
    color: colors.accent.ember,
  },
  advancedToggle: {
    marginBottom: spacing.sm,
  },
  advancedToggleText: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  offlineNotice: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
