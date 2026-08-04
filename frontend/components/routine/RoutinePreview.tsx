import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';
import { Routine } from '../../types';
import { ExerciseRow } from './ExerciseRow';

interface RoutinePreviewProps {
  routine: Routine;
}

export const RoutinePreview = ({ routine }: RoutinePreviewProps) => (
  <View>
    <Text style={styles.title}>{routine.name}</Text>
    {(routine.exercises || []).map((re) => (
      <ExerciseRow key={re.id} routineExercise={re} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
});
