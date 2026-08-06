import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { feltLikeLabel, feltLikeOptions } from '../../utils/feltLike';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface EditWorkoutDialogProps {
  visible: boolean;
  initialTitle?: string;
  initialNotes?: string;
  initialFeltLike?: string;
  onSave: (title?: string, notes?: string, feltLike?: string) => void;
  onCancel: () => void;
}

export const EditWorkoutDialog = ({
  visible,
  initialTitle,
  initialNotes,
  initialFeltLike,
  onSave,
  onCancel,
}: EditWorkoutDialogProps) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [feltLike, setFeltLike] = useState<string | undefined>(initialFeltLike);

  // Dialog instance is shared across opens — resync to the current workout
  // each time it's shown rather than only on first mount.
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle || '');
      setNotes(initialNotes || '');
      setFeltLike(initialFeltLike);
    }
  }, [visible, initialTitle, initialNotes, initialFeltLike]);

  const handleSave = () => {
    onSave(title.trim() || undefined, notes.trim() || undefined, feltLike);
  };

  return (
    <Modal visible={visible} onClose={onCancel}>
      <Text style={styles.title}>Editar entrenamiento</Text>

      <Input label="Título (opcional)" placeholder="Nombre del entrenamiento" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>¿Cómo te sentiste?</Text>
      <View style={styles.options}>
        {feltLikeOptions.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setFeltLike(option === feltLike ? undefined : option)}
            style={[styles.option, feltLike === option && styles.optionSelected]}
            activeOpacity={0.7}
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
          <Button label="Cancelar" variant="ghost" onPress={onCancel} />
        </View>
        <View style={styles.actionButton}>
          <Button label="Guardar cambios" onPress={handleSave} />
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
