import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Link2, X } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { api } from '../../services/api';
import { authStore } from '../../stores/authStore';
import { formatWeight, formatDistance } from '../../utils/units';
import { formatSetDuration } from '../../utils/duration';
import { Card } from '../ui/Card';
import { SetLogger } from './SetLogger';
import { LoggedSetRow } from './LoggedSetRow';
import { EnemyCard } from './EnemyCard';
import { ExerciseNoteField } from './ExerciseNoteField';
import { Exercise, ExerciseBattle, Set } from '../../types';

interface LastSession {
  date: string;
  sets: {
    set_number: number;
    weight: number | null;
    reps: number | null;
    duration_seconds: number | null;
    distance_km: number | null;
    rpe: number | null;
  }[];
}

interface ExerciseLogSectionProps {
  workoutId: string;
  exercise: Exercise;
  loggedSets: Set[];
  battle?: ExerciseBattle;
  note?: string;
  onNoteSaved: (notes: string) => void;
  onSetLogged: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLinkedToPrevious: boolean;
  onToggleLink: () => void;
  supersetGroup?: string;
  shouldRest: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const ExerciseLogSection = ({
  workoutId,
  exercise,
  loggedSets,
  battle,
  note,
  onNoteSaved,
  onSetLogged,
  onRemove,
  isFirst,
  isLinkedToPrevious,
  onToggleLink,
  supersetGroup,
  shouldRest,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ExerciseLogSectionProps) => {
  const globalUnit = authStore((s) => s.user?.weight_unit) || 'kg';
  const globalDistanceUnit = authStore((s) => s.user?.distance_unit) || 'km';
  const unit = exercise.weight_unit || globalUnit;
  const distanceUnit = exercise.distance_unit || globalDistanceUnit;
  const isCardio = exercise.category === 'cardio';
  const sortedSets = [...loggedSets].sort((a, b) => a.set_number - b.set_number);
  const lastSet = sortedSets[sortedSets.length - 1];

  const targetParts = [
    exercise.target_sets ? `${exercise.target_sets} series` : null,
    exercise.target_weight ? formatWeight(exercise.target_weight, unit) : null,
    exercise.target_reps ? `${exercise.target_reps} reps` : null,
  ].filter(Boolean);
  const targetLabel = targetParts.length > 0 ? targetParts.join(' × ') : null;

  const { data: lastSession } = useQuery<LastSession | null>({
    queryKey: ['sets', 'last-session', exercise.id, workoutId],
    queryFn: () =>
      api
        .get(`/sets/exercise/${exercise.id}/last-session`, { params: { excludeWorkoutId: workoutId } })
        .then((r) => r.data),
  });

  return (
    <Card style={[styles.card, !!supersetGroup && styles.cardSuperset]}>
      {!isFirst && (
        <TouchableOpacity
          onPress={onToggleLink}
          style={[styles.linkChip, isLinkedToPrevious && styles.linkChipSelected]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: isLinkedToPrevious }}
        >
          <Link2 size={12} color={isLinkedToPrevious ? colors.accent.ember : colors.text.secondary} />
          <Text style={[styles.linkChipText, isLinkedToPrevious && styles.linkChipTextSelected]}>
            {isLinkedToPrevious ? 'Superset con el anterior' : 'Vincular con el anterior'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <Text style={styles.name}>{exercise.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!canMoveUp}
            hitSlop={10}
            style={styles.reorderButton}
            accessibilityLabel="Mover ejercicio arriba"
            accessibilityRole="button"
          >
            <ChevronUp size={18} color={canMoveUp ? colors.text.secondary : colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!canMoveDown}
            hitSlop={10}
            style={styles.reorderButton}
            accessibilityLabel="Mover ejercicio abajo"
            accessibilityRole="button"
          >
            <ChevronDown size={18} color={canMoveDown ? colors.text.secondary : colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={10}
            accessibilityLabel="Quitar ejercicio"
            accessibilityRole="button"
          >
            <X size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <EnemyCard enemyName={exercise.name} battle={battle} />

      {targetLabel && (
        <Text style={styles.target} numberOfLines={1}>
          Objetivo: {targetLabel}
        </Text>
      )}

      {lastSession && lastSession.sets.length > 0 && (
        <Text style={styles.lastSession} numberOfLines={1}>
          Última vez:{' '}
          {lastSession.sets
            .map((s) =>
              isCardio
                ? `${formatSetDuration(s.duration_seconds || 0)}·${formatDistance(s.distance_km || 0, distanceUnit)}`
                : `${formatWeight(s.weight || 0, unit)}×${s.reps}`
            )
            .join(', ')}
        </Text>
      )}

      {sortedSets.length > 0 && (
        <View style={styles.loggedSets}>
          {sortedSets.map((set) => (
            <LoggedSetRow
              key={set.id}
              set={set}
              isCardio={isCardio}
              exerciseId={exercise.id}
              weightUnit={unit}
              distanceUnit={distanceUnit}
              onChanged={onSetLogged}
            />
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
        shouldRest={shouldRest}
      />

      <ExerciseNoteField value={note} onSave={onNoteSaved} />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reorderButton: {
    width: 20,
    alignItems: 'center',
  },
  target: {
    ...typography.tiny,
    color: colors.accent.ember,
    marginBottom: 2,
  },
  lastSession: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginBottom: spacing.md,
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
