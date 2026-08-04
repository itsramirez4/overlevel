import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, typography } from '../../utils/theme';
import { Card } from '../ui/Card';
import { SetLogger } from './SetLogger';
import { LoggedSetRow } from './LoggedSetRow';
import { Exercise, Set } from '../../types';

interface ExerciseLogSectionProps {
  workoutId: string;
  exercise: Exercise;
  loggedSets: Set[];
  onSetLogged: () => void;
  onRemove: () => void;
}

export const ExerciseLogSection = ({
  workoutId,
  exercise,
  loggedSets,
  onSetLogged,
  onRemove,
}: ExerciseLogSectionProps) => {
  const sortedSets = [...loggedSets].sort((a, b) => a.set_number - b.set_number);
  const lastSet = sortedSets[sortedSets.length - 1];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={10}>
          <X size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {sortedSets.length > 0 && (
        <View style={styles.loggedSets}>
          {sortedSets.map((set) => (
            <LoggedSetRow key={set.id} set={set} onChanged={onSetLogged} />
          ))}
        </View>
      )}

      <SetLogger
        workoutId={workoutId}
        exercise={exercise}
        setNumber={sortedSets.length + 1}
        previousSet={lastSet}
        onSetLogged={onSetLogged}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  loggedSets: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
});
