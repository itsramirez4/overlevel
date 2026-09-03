import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { MUSCLE_GROUPS } from '../../utils/constants';

interface MuscleGroupFilterProps {
  value: string | null;
  onChange: (group: string | null) => void;
}

export const MuscleGroupFilter = ({ value, onChange }: MuscleGroupFilterProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
  >
    <TouchableOpacity
      style={[styles.chip, value === null && styles.chipSelected]}
      onPress={() => onChange(null)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: value === null }}
    >
      <Text style={[styles.chipText, value === null && styles.chipTextSelected]}>Todos</Text>
    </TouchableOpacity>
    {MUSCLE_GROUPS.map((group) => {
      const selected = value === group;
      return (
        <TouchableOpacity
          key={group}
          style={[styles.chip, selected && styles.chipSelected]}
          onPress={() => onChange(selected ? null : group)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected }}
        >
          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.default,
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
});
