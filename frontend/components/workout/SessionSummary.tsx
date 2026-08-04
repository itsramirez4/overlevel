import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';
import { Workout } from '../../types';

interface SessionSummaryProps {
  workout: Workout;
}

export const SessionSummary = ({ workout }: SessionSummaryProps) => {
  const totalSets = workout.sets?.length || 0;
  const totalVolume = (workout.sets || []).reduce((sum, s) => sum + s.weight * s.reps, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Complete</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Total Sets</Text>
        <Text style={styles.value}>{totalSets}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Total Volume</Text>
        <Text style={styles.value}>{totalVolume}kg</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.secondary,
    padding: 20,
    borderRadius: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.text.secondary,
  },
  value: {
    color: colors.accent.fire,
    fontWeight: '700',
  },
});
