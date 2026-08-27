import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, ListChecks } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { Badge } from '../ui/Badge';
import { Routine } from '../../types';

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  /** Position in its list — staggers the entrance animation. */
  index?: number;
}

const patternLabel: Record<Routine['pattern'], string> = {
  fixed_day: 'Día fijo',
  alternating_ab: 'Alternando A/B',
  alternating_abc: 'Alternando A/B/C',
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const RoutineCard = ({ routine, onPress, index = 0 }: RoutineCardProps) => (
  <AnimatedTouchable
    entering={FadeInDown.delay(index * 50).duration(250)}
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.7}
  >
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
    {!!routine.routine_exercises?.length && (
      <Badge
        label={`${routine.routine_exercises.length} ${routine.routine_exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`}
        tone="fire"
        size="sm"
        style={styles.countBadge}
      />
    )}
    <ChevronRight size={18} color={colors.text.muted} />
  </AnimatedTouchable>
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
    marginBottom: spacing.md,
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
  countBadge: {
    marginRight: spacing.sm,
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
