import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronRight, ListChecks } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { Routine } from '../../types';

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
}

const patternLabel: Record<Routine['pattern'], string> = {
  fixed_day: 'Día fijo',
  alternating_ab: 'Alternando A/B',
  alternating_abc: 'Alternando A/B/C',
};

export const RoutineCard = ({ routine, onPress }: RoutineCardProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconBadge}>
      <ListChecks size={18} color={colors.accent.fire} strokeWidth={2} />
    </View>
    <View style={styles.info}>
      <Text style={styles.name}>{routine.name}</Text>
      <Text style={styles.meta}>
        {patternLabel[routine.pattern]}
        {routine.day_of_week ? ` · ${routine.day_of_week}` : ''}
      </Text>
    </View>
    <ChevronRight size={18} color={colors.text.muted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  meta: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
