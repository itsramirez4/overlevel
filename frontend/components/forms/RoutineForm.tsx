import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type Pattern = 'fixed_day' | 'alternating_ab' | 'alternating_abc';

interface RoutineFormData {
  name: string;
  day_of_week?: string;
  pattern?: Pattern;
  notes?: string;
}

interface RoutineFormProps {
  onSubmit: (data: RoutineFormData) => Promise<void>;
  loading?: boolean;
  initialValues?: RoutineFormData;
  submitLabel?: string;
}

const patterns: { value: Pattern; label: string }[] = [
  { value: 'alternating_ab', label: 'Rotación A/B' },
  { value: 'alternating_abc', label: 'Rotación A/B/C' },
  { value: 'fixed_day', label: 'Día fijo' },
];

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const RoutineForm = ({ onSubmit, loading, initialValues, submitLabel }: RoutineFormProps) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [pattern, setPattern] = useState<Pattern>(initialValues?.pattern || 'alternating_ab');
  const [dayOfWeek, setDayOfWeek] = useState(initialValues?.day_of_week || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');

  const handlePatternChange = (next: Pattern) => {
    setPattern(next);
    if (next !== 'fixed_day') setDayOfWeek('');
  };

  return (
    <View>
      <Input label="Nombre" placeholder="Ej. Empuje / Torso" value={name} onChangeText={setName} />

      <Text style={styles.label}>Patrón</Text>
      <View style={styles.chipsRow}>
        {patterns.map((p) => {
          const selected = p.value === pattern;
          return (
            <TouchableOpacity
              key={p.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handlePatternChange(p.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {pattern === 'fixed_day' && (
        <>
          <Text style={styles.label}>Día de la semana</Text>
          <View style={styles.daysWrap}>
            {days.map((day) => {
              const selected = day === dayOfWeek;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.chip, styles.dayChip, selected && styles.chipSelected]}
                  onPress={() => setDayOfWeek(day)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <Input
        label="Notas (opcional)"
        placeholder="Cualquier apunte sobre esta rutina…"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.notesInput}
      />
      <Button
        label={loading ? 'Guardando…' : submitLabel || 'CREAR RUTINA'}
        loading={loading}
        onPress={() =>
          onSubmit({
            name,
            pattern,
            day_of_week: pattern === 'fixed_day' ? dayOfWeek || undefined : undefined,
            notes: notes || undefined,
          })
        }
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
  daysWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  dayChip: {
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
