import { useState } from 'react';
import { Alert, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, History, ListChecks, Repeat, Zap } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { useWorkout } from '../../../hooks/useWorkout';
import { workoutStore } from '../../../stores/workoutStore';
import { Header } from '../../../components/common/Header';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Loader } from '../../../components/ui/Loader';
import { Exercise, Routine, Workout } from '../../../types';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { hasHydrated, currentWorkout, startWorkout } = useWorkout();
  const [starting, setStarting] = useState(false);

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: () => api.get<Routine[]>('/routines').then((r) => r.data),
  });

  const { data: recentWorkouts } = useQuery({
    queryKey: ['workouts', 'recent'],
    queryFn: () => api.get<Workout[]>('/workouts?limit=1').then((r) => r.data),
  });
  const lastWorkout = (recentWorkouts || []).find((w) => w.completed_at);

  const { data: lastWorkoutDetail } = useQuery({
    queryKey: ['workouts', lastWorkout?.id],
    queryFn: () => api.get<Workout>(`/workouts/${lastWorkout!.id}`).then((r) => r.data),
    enabled: !!lastWorkout,
  });

  const handleStart = async (routineId?: string) => {
    if (starting) return;
    setStarting(true);
    try {
      await startWorkout(routineId);
      router.push('/workouts/log');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el entrenamiento. Inténtalo de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  const handleRepeatLast = async () => {
    if (!lastWorkoutDetail || starting) return;
    setStarting(true);
    try {
      const seen = new Set<string>();
      const exercises = (lastWorkoutDetail.sets || [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => s.exercises)
        .filter((ex): ex is Exercise => {
          if (!ex || seen.has(ex.id)) return false;
          seen.add(ex.id);
          return true;
        });

      await startWorkout();
      workoutStore.getState().setSessionExercises(exercises);
      router.push('/workouts/log');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el entrenamiento. Inténtalo de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Header title="Entrenamientos" subtitle="Elige una rutina o improvisa" showLogo />

        {!hasHydrated ? (
          <Loader />
        ) : currentWorkout ? (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() => router.push('/workouts/log')}
            activeOpacity={0.7}
          >
            <View style={styles.routineIconBadge}>
              <Zap size={18} color={colors.accent.fire} strokeWidth={2} />
            </View>
            <View style={styles.resumeBannerText}>
              <Text style={styles.resumeBannerTitle}>Entrenamiento en curso</Text>
              <Text style={styles.resumeBannerSubtitle}>Toca para continuar</Text>
            </View>
            <ChevronRight size={18} color={colors.accent.fire} />
          </TouchableOpacity>
        ) : (
          <>
            <Button
              label="ENTRENAMIENTO LIBRE"
              onPress={() => handleStart()}
              loading={starting}
              disabled={starting}
              style={styles.freestyleButton}
            />

            {(lastWorkoutDetail?.sets?.length ?? 0) > 0 && (
              <TouchableOpacity
                style={styles.repeatButton}
                onPress={handleRepeatLast}
                disabled={starting}
                activeOpacity={0.7}
              >
                <Repeat size={18} color={colors.text.secondary} strokeWidth={2} />
                <Text style={styles.repeatButtonText}>Repetir último entrenamiento</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Tus rutinas</Text>
            {isLoading ? null : !routines?.length ? (
              <EmptyState
                icon={ListChecks}
                title="Sin rutinas todavía"
                message="Crea una desde la pestaña Rutinas para verla aquí."
              />
            ) : (
              routines.map((routine, index) => (
                <AnimatedTouchable
                  key={routine.id}
                  entering={FadeInDown.delay(index * 50).duration(250)}
                  style={styles.routineCard}
                  onPress={() => handleStart(routine.id)}
                  disabled={starting}
                  activeOpacity={0.7}
                >
                  <View style={styles.routineIconBadge}>
                    <Zap size={18} color={colors.accent.fire} strokeWidth={2} />
                  </View>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <ChevronRight size={18} color={colors.text.muted} />
                </AnimatedTouchable>
              ))
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => router.push('/workouts/history')}
          activeOpacity={0.7}
        >
          <History size={16} color={colors.text.secondary} />
          <Text style={styles.historyLinkText}>Ver historial de entrenamientos</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
  freestyleButton: {
    marginBottom: spacing.md,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  repeatButtonText: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent.fire}1a`,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  resumeBannerText: {
    flex: 1,
  },
  resumeBannerTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  resumeBannerSubtitle: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '600',
    marginTop: 2,
  },
  routineCard: {
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
  routineIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  routineName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  historyLinkText: {
    ...typography.small,
    color: colors.text.secondary,
  },
});
