import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';
import { workoutStore } from '../../stores/workoutStore';
import { authStore } from '../../stores/authStore';
import { scheduleRestTimerNotification } from '../../services/notifications';
import { kgToUnit, unitToKg, kmToUnit, unitToKm } from '../../utils/units';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface SetLoggerProps {
  workoutId: string;
  exercise: any;
  setNumber: number;
  onSetLogged: () => void;
  previousSet?: any;
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
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const distanceUnit = authStore((s) => s.user?.distance_unit) || 'km';
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

  const handleSubmit = async () => {
    let cardioPayload: { duration_seconds: number; distance_km: number } | undefined;
    let strengthPayload: { reps: number; weight: number } | undefined;

    if (isCardio) {
      const parsedMinutes = parseFloat(minutes);
      const parsedDistance = parseFloat(distance);
      if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0 || !Number.isFinite(parsedDistance) || parsedDistance <= 0) {
        setError('Tiempo y distancia deben ser números mayores que cero');
        return;
      }
      cardioPayload = {
        duration_seconds: Math.round(parsedMinutes * 60),
        distance_km: unitToKm(parsedDistance, distanceUnit),
      };
    } else {
      const parsedReps = parseInt(reps, 10);
      const parsedWeight = parseFloat(weight);
      if (!Number.isFinite(parsedReps) || parsedReps <= 0 || !Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        setError('Reps y peso deben ser números mayores que cero');
        return;
      }
      strengthPayload = { reps: parsedReps, weight: unitToKg(parsedWeight, unit) };
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/sets', {
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
      });

      setFormNotes('');
      setIsWarmup(false);

      const restSeconds = rest ? parseInt(rest) : 0;
      if (shouldRest && restSeconds > 0) {
        workoutStore.getState().startRest(restSeconds);
        scheduleRestTimerNotification(restSeconds);
      }

      onSetLogged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo registrar la serie');
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
});
