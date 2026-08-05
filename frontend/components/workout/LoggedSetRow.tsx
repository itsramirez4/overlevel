import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil, Trophy, X } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Set } from '../../types';

interface LoggedSetRowProps {
  set: Set;
  onChanged: () => void;
}

export const LoggedSetRow = ({ set, onChanged }: LoggedSetRowProps) => {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [weight, setWeight] = useState(set.weight.toString());
  const [reps, setReps] = useState(set.reps.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!weight || !reps) {
      setError('Reps y peso son obligatorios');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.put(`/sets/${set.id}`, { weight: parseFloat(weight), reps: parseInt(reps) });
      setEditing(false);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo guardar la serie');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    await api.delete(`/sets/${set.id}`);
    onChanged();
  };

  if (editing) {
    return (
      <View style={styles.editRow}>
        <View style={styles.editInputs}>
          <View style={styles.editInput}>
            <Input placeholder="Kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
          </View>
          <View style={styles.editInput}>
            <Input placeholder="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" />
          </View>
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
    <View style={[styles.row, set.is_pr && styles.rowPr, set.is_warmup && styles.rowWarmup]}>
      <Text style={styles.number}>{set.set_number}</Text>
      <Text style={[styles.value, set.is_warmup && styles.valueWarmup]}>
        {set.weight}kg × {set.reps} reps
      </Text>
      {set.is_warmup ? <Text style={styles.warmupTag}>Calentamiento</Text> : null}
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

      <ConfirmDialog
        visible={confirmingDelete}
        title="Borrar serie"
        message={`¿Borrar la serie ${set.set_number} (${set.weight}kg × ${set.reps} reps)?`}
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
});
