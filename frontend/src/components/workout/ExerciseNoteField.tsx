import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { api } from '../../services/api';
import { enqueueOfflineMutation } from '../../hooks/useOfflineSync';
import { getErrorMessage, hasServerResponse } from '../../utils/errors';
import { colors, spacing, typography } from '../../utils/theme';
import { Input } from '../ui/Input';

interface ExerciseNoteFieldProps {
  workoutId: string;
  exerciseId: string;
  value?: string;
  // Called after a successful save (or once it's safely queued offline) so
  // the parent can refetch its notes query.
  onSaved?: () => void;
}

/**
 * The whole-exercise note (how did THIS exercise go today) — separate from
 * a single set's "Notas de forma" in SetLogger. Saves on blur; same
 * no-signal-in-the-gym handling as SetLogger (queues via useOfflineSync
 * instead of silently losing what was typed).
 */
export const ExerciseNoteField = ({ workoutId, exerciseId, value, onSaved }: ExerciseNoteFieldProps) => {
  const [text, setText] = useState(value || '');
  // `value` can arrive/change after this mounts (the notes query resolving
  // or refetching) — sync to it, but only while the user hasn't started
  // typing, so a fetch completing mid-edit can't stomp on unsaved text.
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [queuedOffline, setQueuedOffline] = useState(false);

  // Deliberately keyed on `value` alone, not `[value, dirty]` — handleBlur
  // flips `dirty` to false the instant it starts, before the save even
  // resolves, so keying this on `dirty` too would fire this effect right
  // then and snap the field back to the stale `value` prop (or clear a
  // just-set offline banner) before the actual outcome is known. Only a
  // genuinely new `value` — the parent's data catching up, e.g. after a
  // flush — should trigger a resync; each run still reads the current
  // `dirty` from this render's closure, so "don't stomp active typing"
  // still holds.
  useEffect(() => {
    if (!dirty) setText(value || '');
    setQueuedOffline(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChangeText = (t: string) => {
    setText(t);
    setDirty(true);
  };

  const handleBlur = async () => {
    if (!dirty) return;
    setDirty(false);
    if (text.trim() === (value || '').trim()) return;

    setError('');
    setSaving(true);
    // Safe to clear here (unlike at the very top of this function) — this
    // point isn't reachable until after the `dirty`-flip re-render above has
    // already committed, so it can't race the `[value]` effect.
    setQueuedOffline(false);
    const url = `/workout-exercise-notes/${workoutId}/${exerciseId}`;
    try {
      await api.put(url, { notes: text });
      onSaved?.();
    } catch (err) {
      if (!hasServerResponse(err)) {
        // No response at all means the request never reached the server
        // (no signal — common enough in a gym) rather than the server
        // rejecting it. Queue it instead of just losing what was typed —
        // useOfflineSync (mounted at the app root) flushes it automatically
        // the moment connectivity returns.
        await enqueueOfflineMutation(url, { notes: text }, 'PUT');
        setQueuedOffline(true);
      } else {
        setError(getErrorMessage(err, 'No se pudo guardar la nota'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Input
        label="Nota del ejercicio (opcional)"
        placeholder="¿Cómo fue este ejercicio hoy?"
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        multiline
        editable={!saving}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {queuedOffline ? <Text style={styles.offlineNotice}>Sin conexión — se guardó y se sincronizará solo</Text> : null}
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.tiny,
    color: colors.semantic.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  offlineNotice: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
});
