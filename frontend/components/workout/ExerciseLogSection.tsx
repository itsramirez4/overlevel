import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link2, X } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
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
  isFirst: boolean;
  isLinkedToPrevious: boolean;
  onToggleLink: () => void;
  supersetGroup?: string;
}

export const ExerciseLogSection = ({
  workoutId,
  exercise,
  loggedSets,
  onSetLogged,
  onRemove,
  isFirst,
  isLinkedToPrevious,
  onToggleLink,
  supersetGroup,
}: ExerciseLogSectionProps) => {
  const sortedSets = [...loggedSets].sort((a, b) => a.set_number - b.set_number);
  const lastSet = sortedSets[sortedSets.length - 1];

  return (
    <Card style={[styles.card, !!supersetGroup && styles.cardSuperset]}>
      {!isFirst && (
        <TouchableOpacity
          onPress={onToggleLink}
          style={[styles.linkChip, isLinkedToPrevious && styles.linkChipSelected]}
          activeOpacity={0.7}
        >
          <Link2 size={12} color={isLinkedToPrevious ? colors.accent.ember : colors.text.secondary} />
          <Text style={[styles.linkChipText, isLinkedToPrevious && styles.linkChipTextSelected]}>
            {isLinkedToPrevious ? 'Superset con el anterior' : 'Vincular con el anterior'}
          </Text>
        </TouchableOpacity>
      )}

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
        supersetGroup={supersetGroup}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardSuperset: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.ember,
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
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.sm,
  },
  linkChipSelected: {
    borderColor: colors.accent.ember,
    backgroundColor: `${colors.accent.ember}1a`,
  },
  linkChipText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  linkChipTextSelected: {
    color: colors.accent.ember,
  },
});
