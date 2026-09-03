import { useEffect, useState } from 'react';
import { Alert, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Dumbbell, Flame, CalendarDays, Zap } from 'lucide-react-native';
import { api } from '../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { useWorkout } from '../../hooks/useWorkout';
import { authStore } from '../../stores/authStore';
import { StatCard } from '../../components/analytics/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Logo } from '../../components/common/Logo';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CharacterAvatar } from '../../components/character/CharacterAvatar';
import { getWorkoutName } from '../../utils/workoutName';
import { kgToUnit } from '../../utils/units';
import { getXpProgressLabel } from '../../utils/character';
import { scheduleTrainingReminder, cancelTrainingReminder } from '../../services/notifications';
import { AnalyticsSummary } from '../../types/api';
import { Character, Workout } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const username = authStore((state) => state.user?.username);
  const unit = authStore((state) => state.user?.weight_unit) || 'kg';
  const { hasHydrated, currentWorkout, startWorkout } = useWorkout();
  const [startingWorkout, setStartingWorkout] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<AnalyticsSummary>('/analytics/summary').then((r) => r.data),
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => api.get<Workout[]>('/workouts?limit=3').then((r) => r.data),
  });

  const { data: character } = useQuery({
    queryKey: ['character'],
    queryFn: () => api.get<Character | null>('/characters/me').then((r) => r.data),
  });

  useEffect(() => {
    if (workoutsLoading) return;
    const trainedToday = (workouts || []).some(
      (w) => new Date(w.started_at).toDateString() === new Date().toDateString()
    );
    if (trainedToday) cancelTrainingReminder();
    else scheduleTrainingReminder();
  }, [workoutsLoading, workouts]);

  const handleStartWorkout = async () => {
    // Without this, tapping the button before AsyncStorage rehydrates always
    // sees currentWorkout as its default null (even if a real in-progress
    // workout is about to load in) and starts a duplicate that orphans it —
    // see the same guard in workouts/index.tsx and workoutStore's own comment.
    if (!hasHydrated) return;
    if (currentWorkout) {
      router.push('/workouts/log');
      return;
    }
    if (startingWorkout) return;
    setStartingWorkout(true);
    try {
      await startWorkout(stats?.recommended_routine?.id);
      router.push('/workouts/log');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el entrenamiento. Inténtalo de nuevo.');
    } finally {
      setStartingWorkout(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Logo variant="horizontal" size="sm" />
          <Text style={styles.greeting}>Hola{username ? `, ${username}` : ''}</Text>
          <Text style={styles.title} accessibilityRole="header">
            Tu progreso
          </Text>
        </View>

        {character && (
          <TouchableOpacity
            style={styles.characterBanner}
            onPress={() => router.push('/profile/character')}
            activeOpacity={0.7}
          >
            <View style={styles.characterIconBadge}>
              <CharacterAvatar type={character.character_type} size={56} />
            </View>
            <View style={styles.characterInfo}>
              <View style={styles.characterNameRow}>
                <Text style={styles.characterName} numberOfLines={1}>
                  {character.name}
                </Text>
                <Badge label={`NIVEL ${character.level}`} tone="fire" size="sm" />
              </View>
              <ProgressBar progress={character.progress} height={5} style={styles.characterXpTrack} />
              <Text style={styles.characterXpLabel}>{getXpProgressLabel(character)}</Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <StatCard
            label="Este mes"
            value={statsLoading ? '—' : stats?.workouts_this_month ?? 0}
            icon={CalendarDays}
          />
          <StatCard
            label="Volumen total"
            value={statsLoading ? '—' : `${Math.round(kgToUnit(stats?.total_volume || 0, unit))}${unit}`}
            icon={Flame}
          />
          <StatCard
            label="Racha"
            value={statsLoading ? '—' : `${stats?.current_streak ?? 0}d`}
            icon={Zap}
          />
        </View>

        {stats?.recommended_routine && (
          <Text style={styles.recommendation}>
            Hoy toca: <Text style={styles.recommendationName}>{stats.recommended_routine.name}</Text>
          </Text>
        )}

        <Button
          label={currentWorkout ? 'CONTINUAR ENTRENAMIENTO' : 'EMPEZAR ENTRENAMIENTO'}
          onPress={handleStartWorkout}
          loading={startingWorkout || !hasHydrated}
          disabled={startingWorkout || !hasHydrated}
          style={styles.startButton}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrenamientos recientes</Text>
          {workoutsLoading ? null : !workouts?.length ? (
            <EmptyState
              icon={Dumbbell}
              title="Todavía no hay entrenamientos"
              message="Cuando termines uno, aparecerá aquí."
            />
          ) : (
            workouts.map((workout, index) => (
              <WorkoutRow
                key={workout.id}
                workout={workout}
                index={index}
                onPress={() => router.push(`/workouts/detail?id=${workout.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const WorkoutRow = ({
  workout,
  index,
  onPress,
}: {
  workout: Workout;
  index: number;
  onPress: () => void;
}) => (
  <AnimatedTouchable
    entering={FadeInDown.delay(index * 50).duration(250)}
    style={styles.workoutCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.workoutIconBadge}>
      <Dumbbell size={18} color={colors.accent.fire} strokeWidth={2} />
    </View>
    <View style={styles.workoutInfo}>
      <Text style={styles.workoutDate} numberOfLines={1}>
        {getWorkoutName(workout)}
      </Text>
      <Text style={styles.workoutSets}>{workout.sets?.length || 0} sets registrados</Text>
    </View>
    <ChevronRight size={18} color={colors.text.muted} />
  </AnimatedTouchable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  characterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  characterIconBadge: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  characterInfo: {
    flex: 1,
    gap: 4,
  },
  characterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  characterName: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  characterXpTrack: {
    marginTop: 2,
  },
  characterXpLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  recommendation: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  recommendationName: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  startButton: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  workoutCard: {
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
  workoutIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutDate: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  workoutSets: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
