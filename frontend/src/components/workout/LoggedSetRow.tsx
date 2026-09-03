import { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link2, Pencil, Trophy, X } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';
import { workoutStore } from '../../stores/workoutStore';
import { enqueueOfflineMutation } from '../../hooks/useOfflineSync';
import { formatWeight, kgToUnit, unitToKg, formatDistance, kmToUnit, unitToKm, DistanceUnit } from '../../utils/units';
import { WeightUnit } from '../../services/calculations';
import { formatSetDuration } from '../../utils/duration';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UnitToggle } from './UnitToggle';
import { Set } from '../../types';
import { getErrorMessage, hasServerResponse } from '../../utils/errors';

interface LoggedSetRowProps {
  set: Set;
  isCardio?: boolean;
  exerciseId: string;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  onChanged: () => void;
}

export const LoggedSetRow = ({
  set,
  isCardio,
  exerciseId,
  weightUnit: unit,
  distanceUnit,
  onChanged,
}: LoggedSetRowProps) => {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [weight, setWeight] = useState(kgToUnit(set.weight || 0, unit).toString());
  const [reps, setReps] = useState((set.reps ?? '').toString());
  const [minutes, setMinutes] = useState(set.duration_seconds != null ? (set.duration_seconds / 60).toString() : '');
  const [distance, setDistance] = useState(
    set.distance_km != null ? kmToUnit(set.distance_km, distanceUnit).toString() : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [queuedOffline, setQueuedOffline] = useState(false);

  // Same fire-and-forget persistence + shared-state update as SetLogger's
  // unit toggle — see the comment there.
  const persistUnit = (patch: { weight_unit: WeightUnit } | { distance_unit: DistanceUnit }) => {
    workoutStore.getState().updateSessionExercise(exerciseId, patch);
    api.put(`/exercises/${exerciseId}`, patch).catch(() => {});
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

  const handleSave = async () => {
    let payload: Record<string, number>;

    if (isCardio) {
      const parsedMinutes = parseFloat(minutes);
      const parsedDistance = parseFloat(distance);
      // < 0, not <= 0: 0 distance (stationary/no-distance cardio) and 0
      // duration are both real values someone might log.
      if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0 || !Number.isFinite(parsedDistance) || parsedDistance < 0) {
        setError('Tiempo y distancia no pueden ser negativos');
        return;
      }
      payload = {
        duration_seconds: Math.round(parsedMinutes * 60),
        distance_km: unitToKm(parsedDistance, distanceUnit),
      };
    } else {
      const parsedWeight = parseFloat(weight);
      const parsedReps = parseInt(reps, 10);
      // < 0, not <= 0: 0 is a real, valid value for both.
      if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || !Number.isFinite(parsedReps) || parsedReps < 0) {
        setError('Reps y peso no pueden ser negativos');
        return;
      }
      payload = { weight: unitToKg(parsedWeight, unit), reps: parsedReps };
    }

    setError('');
    setQueuedOffline(false);
    setSaving(true);
    try {
      await api.put(`/sets/${set.id}`, payload);
      setEditing(false);
      onChanged();
    } catch (err) {
      if (!hasServerResponse(err)) {
        // No response at all — never reached the server (no signal), not
        // rejected by it. Queue the edit instead of leaving it stuck open
        // with a misleading error; useOfflineSync flushes it automatically
        // the moment connectivity returns.
        await enqueueOfflineMutation(`/sets/${set.id}`, payload, 'PUT');
        setEditing(false);
        setQueuedOffline(true);
      } else {
        setError(getErrorMessage(err, 'No se pudo guardar la serie'));
      }
    } finally {
      setSaving(false);
    }
  };

  const displayValue = isCardio
    ? `${formatSetDuration(set.duration_seconds || 0)} · ${formatDistance(set.distance_km || 0, distanceUnit)}`
    : `${formatWeight(set.weight || 0, unit)} × ${set.reps} reps`;

  const handleDelete = async () => {
    try {
      await api.delete(`/sets/${set.id}`);
      setConfirmingDelete(false);
      onChanged();
    } catch (err) {
      setConfirmingDelete(false);
      if (!hasServerResponse(err)) {
        await enqueueOfflineMutation(`/sets/${set.id}`, undefined, 'DELETE');
        setQueuedOffline(true);
      } else {
        Alert.alert('Error', 'No se pudo borrar la serie. Inténtalo de nuevo.');
      }
    }
  };

  if (editing) {
    return (
      <View style={styles.editRow}>
        <View style={styles.editInputs}>
          {isCardio ? (
            <>
              <View style={styles.editInput}>
                <Input placeholder="Minutos" value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" />
              </View>
              <View style={styles.editInput}>
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
              <View style={styles.editInput}>
                <UnitToggle label={unit} onPress={handleToggleWeightUnit} />
                <Input
                  placeholder={unit === 'lbs' ? 'Lbs' : 'Kg'}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.editInput}>
                <Input placeholder="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" />
              </View>
            </>
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.editActions}>
          <View style={styles.editActionButton}>
            <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
          </View>
          <View style={styles.editActionButton}>
            <Button label={saving ? 'Guardando…' : 'Guardar'} loading={saving} onPress={handleSave} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.row, set.is_pr && styles.rowPr, set.is_warmup && styles.rowWarmup]}>
        <Text style={styles.number}>{set.set_number}</Text>
        <Text style={[styles.value, set.is_warmup && styles.valueWarmup]}>{displayValue}</Text>
        {set.is_warmup ? <Text style={styles.warmupTag}>Calentamiento</Text> : null}
        {set.superset_group ? <Link2 size={12} color={colors.accent.ember} strokeWidth={2.2} /> : null}
        {set.is_pr && <Trophy size={14} color={colors.accent.ember} strokeWidth={2.2} />}
        {set.rpe ? <Text style={styles.rpe}>RPE {set.rpe}</Text> : null}
        <TouchableOpacity
          onPress={() => setEditing(true)}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityLabel={`Editar serie ${set.set_number}`}
        >
          <Pencil size={14} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setConfirmingDelete(true)}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityLabel={`Borrar serie ${set.set_number}`}
        >
          <X size={14} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>

      {queuedOffline ? <Text style={styles.offlineNotice}>Sin conexión — se sincronizará solo</Text> : null}

      <ConfirmDialog
        visible={confirmingDelete}
        title="Borrar serie"
        message={`¿Borrar la serie ${set.set_number} (${displayValue})?`}
        confirmLabel="Borrar"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  rowPr: {
    borderWidth: 1,
    borderColor: colors.accent.ember,
  },
  rowWarmup: {
    opacity: 0.65,
  },
  number: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '800',
    width: 16,
  },
  value: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  valueWarmup: {
    fontWeight: '400',
  },
  warmupTag: {
    ...typography.tiny,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  rpe: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  iconButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  editInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editInput: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editActionButton: {
    flex: 1,
  },
  error: {
    ...typography.tiny,
    color: colors.semantic.error,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  offlineNotice: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
