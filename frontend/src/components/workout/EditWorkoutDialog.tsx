import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { feltLikeLabel, feltLikeOptions } from '../../utils/feltLike';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface EditWorkoutDialogProps {
  visible: boolean;
  loading?: boolean;
  initialTitle?: string | null;
  initialNotes?: string | null;
  // A workout with no felt_like set comes back from the API as null (a
  // real Postgres NULL), not a missing/undefined field.
  initialFeltLike?: string | null;
  initialStartedAt: string;
  onSave: (title?: string, notes?: string, feltLike?: string, startedAt?: string) => void;
  onCancel: () => void;
}

export const EditWorkoutDialog = ({
  visible,
  loading,
  initialTitle,
  initialNotes,
  initialFeltLike,
  initialStartedAt,
  onSave,
  onCancel,
}: EditWorkoutDialogProps) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [notes, setNotes] = useState(initialNotes || '');
  // ?? not ||: coalesces null (never-set) the same way, but a falsy string
  // value can't happen here anyway (feltLike is always a whole enum option).
  const [feltLike, setFeltLike] = useState<string | undefined>(initialFeltLike ?? undefined);
  const [startedAt, setStartedAt] = useState(new Date(initialStartedAt));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Dialog instance is shared across opens — resync to the current workout
  // each time it's shown rather than only on first mount.
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle || '');
      setNotes(initialNotes || '');
      setFeltLike(initialFeltLike ?? undefined);
      setStartedAt(new Date(initialStartedAt));
    }
  }, [visible, initialTitle, initialNotes, initialFeltLike, initialStartedAt]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type !== 'set' || !selected) return;
    // Only the day changes — the original time-of-day carries over, so this
    // can't collide with another workout's exact timestamp and doesn't
    // pretend to know what time it actually happened.
    setStartedAt((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  };

  const handleSave = () => {
    onSave(title.trim() || undefined, notes.trim() || undefined, feltLike, startedAt.toISOString());
  };

  return (
    <Modal visible={visible} onClose={onCancel}>
      <Text style={styles.title}>Editar entrenamiento</Text>

      <Input label="Título (opcional)" placeholder="Nombre del entrenamiento" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Fecha</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Cambiar la fecha del entrenamiento"
      >
        <Text style={styles.dateButtonText}>
          {startedAt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker value={startedAt} mode="date" display="default" maximumDate={new Date()} onChange={handleDateChange} />
      )}

      <Text style={styles.label}>¿Cómo te sentiste?</Text>
      <View style={styles.options}>
        {feltLikeOptions.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setFeltLike(option === feltLike ? undefined : option)}
            style={[styles.option, feltLike === option && styles.optionSelected]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: feltLike === option }}
          >
            <Text style={[styles.optionText, feltLike === option && styles.optionTextSelected]}>
              {feltLikeLabel[option]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label="Notas (opcional)"
        placeholder="Cómo fue el entrenamiento…"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.notesInput}
      />

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Button label="Cancelar" variant="ghost" onPress={onCancel} disabled={loading} />
        </View>
        <View style={styles.actionButton}>
          <Button label="Guardar cambios" onPress={handleSave} loading={loading} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  dateButton: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.default,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  optionSelected: {
    borderColor: colors.accent.ember,
    backgroundColor: `${colors.accent.ember}1a`,
  },
  optionText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: colors.accent.ember,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
