import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { WorkoutHeatmap } from '../../../components/analytics/WorkoutHeatmap';
import { getWorkoutName } from '../../../utils/workoutName';
import { formatDuration } from '../../../utils/duration';

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', 'history'],
    queryFn: () => api.get('/workouts?limit=200').then((r) => r.data),
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['analytics', 'heatmap'],
    queryFn: () => api.get('/analytics/heatmap?weeks=10').then((r) => r.data),
  });

  const exerciseNames = (workout: any): string[] => {
    const names = new Set<string>();
    (workout.sets || []).forEach((s: any) => {
      if (s.exercises?.name) names.add(s.exercises.name);
    });
    return Array.from(names);
  };

  const query = search.trim().toLowerCase();
  const filteredWorkouts = (workouts || []).filter((w: any) => {
    if (!query) return true;
    const dateLabel = new Date(w.started_at)
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      .toLowerCase();
    if (dateLabel.includes(query)) return true;
    if (getWorkoutName(w).toLowerCase().includes(query)) return true;
    if (w.notes && w.notes.toLowerCase().includes(query)) return true;
    return exerciseNames(w).some((name) => name.toLowerCase().includes(query));
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Historial</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input placeholder="Buscar por ejercicio o fecha…" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          !query && heatmapData?.length ? (
            <Card style={styles.heatmapCard}>
              <Text style={styles.heatmapTitle}>Constancia</Text>
              <WorkoutHeatmap data={heatmapData} />
            </Card>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={Dumbbell}
              title={query ? 'Sin resultados' : 'Sin entrenamientos'}
              message={query ? 'Prueba con otro ejercicio o fecha.' : 'Aún no has completado ninguno.'}
            />
          )
        }
        renderItem={({ item }: any) => {
          const name = getWorkoutName(item);
          const hasExplicitName = !!(item.title || item.routines?.name);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/workouts/detail?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Dumbbell size={16} color={colors.accent.fire} strokeWidth={2} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.date} numberOfLines={1}>
                  {name}
                </Text>
                {hasExplicitName && (
                  <Text style={styles.dateSecondary}>
                    {new Date(item.started_at).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                )}
                {item.notes ? (
                  <Text style={styles.description} numberOfLines={1}>
                    {item.notes}
                  </Text>
                ) : null}
                <Text style={styles.sets} numberOfLines={1}>
                  {item.sets?.length || 0} sets
                  {item.duration_minutes ? ` · ${formatDuration(item.duration_minutes)}` : ''}
                  {exerciseNames(item).length ? ` · ${exerciseNames(item).join(', ')}` : ''}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.muted} />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  heatmapCard: {
    marginBottom: spacing.lg,
  },
  heatmapTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
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
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  date: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateSecondary: {
    ...typography.tiny,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  description: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  sets: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
