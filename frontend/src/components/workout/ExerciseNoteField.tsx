import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Input } from '../ui/Input';

interface ExerciseNoteFieldProps {
  value?: string;
  onSave: (notes: string) => void;
}

/**
 * The whole-exercise note (how did THIS exercise go today) — separate from
 * a single set's "Notas de forma" in SetLogger. Saves on blur, fire-and-
 * forget, same as the per-exercise unit toggle elsewhere in this screen.
 */
export const ExerciseNoteField = ({ value, onSave }: ExerciseNoteFieldProps) => {
  const [text, setText] = useState(value || '');
  // `value` can arrive after this mounts (the notes query resolving) — sync
  // to it, but only while the user hasn't started typing, so a fetch
  // completing mid-edit can't stomp on unsaved text.
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setText(value || '');
  }, [value, dirty]);

  const handleChangeText = (t: string) => {
    setText(t);
    setDirty(true);
  };

  const handleBlur = () => {
    if (!dirty) return;
    setDirty(false);
    if (text.trim() === (value || '').trim()) return;
    onSave(text);
  };

  return (
    <Input
      label="Nota del ejercicio (opcional)"
      placeholder="¿Cómo fue este ejercicio hoy?"
      value={text}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      multiline
      style={styles.input}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    textAlignVertical: 'top',
  },
});
