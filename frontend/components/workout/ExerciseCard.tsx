import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface ExerciseCardProps {
  name: string;
  targetSets?: number;
  targetWeight?: number;
  targetReps?: number;
}

export const ExerciseCard = ({ name, targetSets, targetWeight, targetReps }: ExerciseCardProps) => (
  <View style={styles.card}>
    <Text style={styles.name}>{name}</Text>
    {targetSets && (
      <Text style={styles.meta}>
        {targetSets} sets × {targetWeight}kg × {targetReps} reps
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  name: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    color: colors.text.secondary,
    marginTop: 4,
  },
});
