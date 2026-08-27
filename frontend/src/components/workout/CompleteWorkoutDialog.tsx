import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { feltLikeLabel, feltLikeOptions } from '../../utils/feltLike';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CompleteWorkoutDialogProps {
  visible: boolean;
  loading?: boolean;
  /** Prefilled into the title field — the routine's name for a routine-based
   * workout, or empty for a free one (same as Hevy). Still fully editable. */
  defaultTitle?: string;
  onConfirm: (title?: string, feltLike?: string, notes?: string) => void;
  onCancel: () => void;
}

export const CompleteWorkoutDialog = ({
  visible,
  loading,
  defaultTitle,
  onConfirm,
  onCancel,
}: CompleteWorkoutDialogProps) => {
  const [title, setTitle] = useState(defaultTitle || '');
  const [feltLike, setFeltLike] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  // Reset once the dialog actually closes (cancel, or a successful
  // completion) — not on every confirm tap, so a failed attempt keeps
  // what the user typed instead of silently discarding it.
  useEffect(() => {
    if (!visible) {
      setTitle(defaultTitle || '');
      setFeltLike(undefined);
      setNotes('');
    }
  }, [visible, defaultTitle]);

  const handleConfirm = () => {
    onConfirm(title.trim() || undefined, feltLike, notes.trim() || undefined);
  };

  return (
    <Modal visible={visible} onClose={onCancel}>
      <Text style={styles.title}>¿Cómo te sentiste?</Text>

      <Input label="Título (opcional)" placeholder="Nombre del entrenamiento" value={title} onChangeText={setTitle} />

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
          <Button label="Terminar" onPress={handleConfirm} loading={loading} disabled={loading} />
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
