import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronLeft, Dumbbell, Flame, Trophy } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, radius, spacing, typography } from '../../../../utils/theme';
import { StatCard } from '../../../../components/analytics/StatCard';
import { Card } from '../../../../components/ui/Card';
import { ProgressChart } from '../../../../components/analytics/ProgressChart';
import { authStore } from '../../../../stores/authStore';
import { kgToUnit } from '../../../../utils/units';

type Metric = 'estimated_1rm' | 'weight';

const metricLabel: Record<Metric, string> = {
  estimated_1rm: '1RM estimado',
  weight: 'Peso máximo',
};

export default function ExerciseAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>('estimated_1rm');
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', 'exercise', id],
    queryFn: () => api.get(`/analytics/exercise/${id}`).then((r) => r.data),
  });

  const { data: progress } = useQuery({
    queryKey: ['analytics', 'exercise', id, 'progress'],
    queryFn: () => api.get(`/analytics/exercise/${id}/progress`).then((r) => r.data),
    enabled: !!id,
  });

  const chartPoints = (progress || []).map((p: any) => ({ date: p.date, value: kgToUnit(p[metric], unit) }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          {isLoading ? 'Ejercicio' : stats?.name}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.statsRow}>
          <StatCard
            label="1RM estimado"
            value={stats?.estimated_1rm ? `${Math.round(kgToUnit(stats.estimated_1rm, unit))}${unit}` : '—'}
            icon={Trophy}
          />
          <StatCard
            label="Peso máximo"
            value={stats?.max_weight ? `${kgToUnit(stats.max_weight, unit)}${unit}` : '—'}
            icon={Dumbbell}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Volumen total"
            value={stats?.total_volume ? `${Math.round(kgToUnit(stats.total_volume, unit))}${unit}` : '—'}
            icon={Flame}
          />
          <StatCard label="RPE medio" value={stats?.avg_rpe ?? '—'} icon={Activity} />
        </View>

        {chartPoints.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Progreso</Text>
              <View style={styles.metricToggle}>
                {(Object.keys(metricLabel) as Metric[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMetric(m)}
                    style={[styles.metricOption, metric === m && styles.metricOptionActive]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: metric === m }}
                    accessibilityLabel={metricLabel[m]}
                  >
                    <Text style={[styles.metricOptionText, metric === m && styles.metricOptionTextActive]}>
                      {metricLabel[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <ProgressChart points={chartPoints} unit={unit} />
          </Card>
        )}
      </ScrollView>
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
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  contentInner: {
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartCard: {
    marginTop: spacing.sm,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    padding: 3,
  },
  metricOption: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  metricOptionActive: {
    backgroundColor: colors.accent.fire,
  },
  metricOptionText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  metricOptionTextActive: {
    color: colors.text.primary,
  },
});
