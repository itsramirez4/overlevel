import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { MUSCLE_GROUPS } from '../../utils/constants';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface ExerciseFormData {
  name: string;
  category: 'compound' | 'isolation' | 'cardio';
  notes?: string;
  muscle_groups?: string[];
}

interface ExerciseFormProps {
  onSubmit: (data: ExerciseFormData) => Promise<void>;
  loading?: boolean;
  initialValues?: ExerciseFormData;
  submitLabel?: string;
}

const categories: { value: ExerciseFormData['category']; label: string }[] = [
  { value: 'compound', label: 'Compuesto' },
  { value: 'isolation', label: 'Aislamiento' },
  { value: 'cardio', label: 'Cardio' },
];

export const ExerciseForm = ({ onSubmit, loading, initialValues, submitLabel }: ExerciseFormProps) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [category, setCategory] = useState<ExerciseFormData['category']>(initialValues?.category || 'compound');
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [muscleGroups, setMuscleGroups] = useState<string[]>(initialValues?.muscle_groups || []);

  const toggleMuscleGroup = (group: string) => {
    setMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  return (
    <View>
      <Input label="Nombre" placeholder="Ej. Sentadilla" value={name} onChangeText={setName} />

      <Text style={styles.label}>Categoría</Text>
      <View style={styles.chipsRow}>
        {categories.map((c) => {
          const selected = c.value === category;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Grupos musculares (opcional)</Text>
      <View style={styles.muscleGroupsWrap}>
        {MUSCLE_GROUPS.map((group) => {
          const selected = muscleGroups.includes(group);
          return (
            <TouchableOpacity
              key={group}
              style={[styles.chip, styles.muscleChip, selected && styles.chipSelected]}
              onPress={() => toggleMuscleGroup(group)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Instrucciones (opcional)"
        placeholder="Cómo hacer el ejercicio, técnica, precauciones…"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.notesInput}
      />

      <Button
        label={loading ? 'Guardando…' : submitLabel || 'GUARDAR EJERCICIO'}
        loading={loading}
        // Two of this form's callers (routines/add-exercise.tsx,
        // workouts/add-exercise.tsx) submit straight through with no name
        // validation of their own — a whitespace-only or empty name would
        // only get caught server-side. Trimmed and gated here instead, same
        // as RoutineForm.
        disabled={!name.trim()}
        onPress={() => onSubmit({ name: name.trim(), category, notes: notes || undefined, muscle_groups: muscleGroups })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  muscleGroupsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  muscleChip: {
    flex: 0,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.accent.fire,
    backgroundColor: `${colors.accent.fire}1a`,
  },
  chipText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.accent.fire,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
