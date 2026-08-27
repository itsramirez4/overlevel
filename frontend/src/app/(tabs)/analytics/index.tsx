import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronRight } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { EmptyState } from '../../../components/common/EmptyState';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { VolumeChart } from '../../../components/analytics/VolumeChart';

interface TrainedExercise {
  id: string;
  name: string;
}

interface VolumeHistoryPoint {
  week_start: string;
  total_volume: number;
}

interface MuscleDistributionEntry {
  muscle_group: string;
  volume: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['analytics', 'trained-exercises'],
    queryFn: () => api.get<TrainedExercise[]>('/analytics/trained-exercises').then((r) => r.data),
  });

  const filteredExercises = (exercises || []).filter((e) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const { data: volumeHistory } = useQuery({
    queryKey: ['analytics', 'volume-history'],
    queryFn: () => api.get<VolumeHistoryPoint[]>('/analytics/volume-history?weeks=8').then((r) => r.data),
  });

  const { data: muscleDistribution } = useQuery({
    queryKey: ['analytics', 'muscle-distribution'],
    queryFn: () => api.get<MuscleDistributionEntry[]>('/analytics/muscle-distribution?weeks=8').then((r) => r.data),
  });

  const chartData = (volumeHistory || []).map((w) => ({
    label: new Date(w.week_start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    volume: Math.round(w.total_volume),
  }));

  const hasVolume = chartData.some((d) => d.volume > 0);

  const muscleChartData = (muscleDistribution || []).map((m) => ({
    label: m.muscle_group,
    volume: Math.round(m.volume),
  }));

  const hasMuscleDistribution = muscleChartData.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Header title="Analíticas" subtitle="Progreso por ejercicio" showLogo />

        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {(hasVolume || hasMuscleDistribution) && (
                <>
                  {hasVolume && (
                    <Card style={styles.chartCard}>
                      <Text style={styles.chartTitle}>Volumen semanal</Text>
                      <VolumeChart data={chartData} title="Volumen semanal" />
                    </Card>
                  )}
                  {hasMuscleDistribution && (
                    <Card style={styles.chartCard}>
                      <Text style={styles.chartTitle}>Distribución por grupo muscular</Text>
                      <VolumeChart data={muscleChartData} title="Distribución por grupo muscular" />
                    </Card>
                  )}
                </>
              )}
              {(exercises || []).length > 0 && (
                <Input
                  placeholder="Buscar ejercicio…"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.search}
                />
              )}
            </>
          }
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyState
                icon={BarChart3}
                title={search ? 'Sin resultados' : 'Sin ejercicios todavía'}
                message={search ? 'Prueba con otro nombre.' : 'Registra sets para ver tu progreso aquí.'}
              />
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedTouchable
              entering={FadeInDown.delay(index * 50).duration(250)}
              style={styles.card}
              onPress={() => router.push(`/analytics/exercise/${item.id}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Ver progreso de ${item.name}`}
            >
              <View style={styles.iconBadge}>
                <BarChart3 size={18} color={colors.accent.fire} strokeWidth={2} />
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <ChevronRight size={18} color={colors.text.muted} />
            </AnimatedTouchable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  search: {
    marginBottom: spacing.md,
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
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
  cardName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
  },
});
