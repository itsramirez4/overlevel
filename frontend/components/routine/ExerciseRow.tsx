import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';
import { RoutineExercise } from '../../types';

interface ExerciseRowProps {
  routineExercise: RoutineExercise;
}

export const ExerciseRow = ({ routineExercise }: ExerciseRowProps) => (
  <View
    style={styles.row}
    accessible
    accessibilityLabel={`${routineExercise.order_num}. ${routineExercise.exercise?.name}, ${routineExercise.target_sets} series × ${routineExercise.target_weight}kg × ${routineExercise.target_reps} repeticiones`}
  >
    <Text style={styles.order}>{routineExercise.order_num}</Text>
    <View style={styles.details}>
      <Text style={styles.name}>{routineExercise.exercise?.name}</Text>
      <Text style={styles.meta}>
        {routineExercise.target_sets} sets × {routineExercise.target_weight}kg × {routineExercise.target_reps} reps
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  order: {
    color: colors.accent.fire,
    fontWeight: '800',
    width: 24,
  },
  details: {
    flex: 1,
  },
  name: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  meta: {
    color: colors.text.secondary,
    marginTop: 2,
    fontSize: 12,
  },
});
