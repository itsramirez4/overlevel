import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronLeft, Dumbbell, Flame, MapPin, Timer, Trophy } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, radius, spacing, typography } from '../../../../utils/theme';
import { StatCard } from '../../../../components/analytics/StatCard';
import { Card } from '../../../../components/ui/Card';
import { ProgressChart } from '../../../../components/analytics/ProgressChart';
import { authStore } from '../../../../stores/authStore';
import { kgToUnit, kmToUnit, formatDistance, paceToUnit } from '../../../../utils/units';
import { formatSetDuration, formatPace } from '../../../../utils/duration';

type StrengthMetric = 'estimated_1rm' | 'weight';
type CardioMetric = 'distance_km' | 'pace_min_per_km';

interface ExerciseStats {
  name: string;
  category: 'compound' | 'isolation' | 'cardio';
  estimated_1rm?: number;
  max_weight?: number;
  total_volume?: number;
  avg_rpe?: number;
  max_distance_km?: number;
  total_distance_km?: number;
  total_duration_seconds?: number;
}

// One shape covers both session-progress endpoints (strength vs. cardio) —
// each response only ever populates its own subset of these fields.
interface ExerciseProgressPoint {
  date: string;
  weight?: number;
  estimated_1rm?: number;
  distance_km?: number;
  pace_min_per_km?: number | null;
}

const strengthMetricLabel: Record<StrengthMetric, string> = {
  estimated_1rm: '1RM estimado',
  weight: 'Peso máximo',
};

const cardioMetricLabel: Record<CardioMetric, string> = {
  distance_km: 'Distancia',
  pace_min_per_km: 'Ritmo',
};

export default function ExerciseAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [strengthMetric, setStrengthMetric] = useState<StrengthMetric>('estimated_1rm');
  const [cardioMetric, setCardioMetric] = useState<CardioMetric>('distance_km');
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const distanceUnit = authStore((s) => s.user?.distance_unit) || 'km';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', 'exercise', id],
    queryFn: () => api.get<ExerciseStats>(`/analytics/exercise/${id}`).then((r) => r.data),
  });

  const { data: progress } = useQuery({
    queryKey: ['analytics', 'exercise', id, 'progress'],
    queryFn: () => api.get<ExerciseProgressPoint[]>(`/analytics/exercise/${id}/progress`).then((r) => r.data),
    enabled: !!id,
  });

  const isCardio = stats?.category === 'cardio';
  const chartPoints = isCardio
    ? (progress || []).map((p) => ({
        date: p.date,
        value:
          cardioMetric === 'distance_km'
            ? kmToUnit(p.distance_km ?? 0, distanceUnit)
            : paceToUnit(p.pace_min_per_km ?? 0, distanceUnit),
      }))
    : (progress || []).map((p) => ({ date: p.date, value: kgToUnit(p[strengthMetric] ?? 0, unit) }));
  const avgPaceMinPerKm =
    stats?.total_distance_km && stats.total_duration_seconds != null && stats.total_distance_km > 0
      ? stats.total_duration_seconds / 60 / stats.total_distance_km
      : null;
  const avgPace = avgPaceMinPerKm != null ? paceToUnit(avgPaceMinPerKm, distanceUnit) : null;

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
        {isCardio ? (
          <>
            <View style={styles.statsRow}>
              <StatCard
                label="Distancia máxima"
                value={stats?.max_distance_km != null ? formatDistance(stats.max_distance_km, distanceUnit) : '—'}
                icon={MapPin}
              />
              <StatCard
                label="Distancia total"
                value={stats?.total_distance_km != null ? formatDistance(stats.total_distance_km, distanceUnit) : '—'}
                icon={Flame}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Ritmo medio" value={formatPace(avgPace, distanceUnit)} icon={Timer} />
              <StatCard label="RPE medio" value={stats?.avg_rpe ?? '—'} icon={Activity} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                label="1RM estimado"
                value={stats?.estimated_1rm != null ? `${Math.round(kgToUnit(stats.estimated_1rm, unit))}${unit}` : '—'}
                icon={Trophy}
              />
              <StatCard
                label="Peso máximo"
                value={stats?.max_weight != null ? `${kgToUnit(stats.max_weight, unit)}${unit}` : '—'}
                icon={Dumbbell}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Volumen total"
                value={stats?.total_volume != null ? `${Math.round(kgToUnit(stats.total_volume, unit))}${unit}` : '—'}
                icon={Flame}
              />
              <StatCard label="RPE medio" value={stats?.avg_rpe ?? '—'} icon={Activity} />
            </View>
          </>
        )}

        {chartPoints.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Progreso</Text>
              {isCardio ? (
                <View style={styles.metricToggle}>
                  {(Object.keys(cardioMetricLabel) as CardioMetric[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setCardioMetric(m)}
                      style={[styles.metricOption, cardioMetric === m && styles.metricOptionActive]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: cardioMetric === m }}
                      accessibilityLabel={cardioMetricLabel[m]}
                    >
                      <Text style={[styles.metricOptionText, cardioMetric === m && styles.metricOptionTextActive]}>
                        {cardioMetricLabel[m]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.metricToggle}>
                  {(Object.keys(strengthMetricLabel) as StrengthMetric[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setStrengthMetric(m)}
                      style={[styles.metricOption, strengthMetric === m && styles.metricOptionActive]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: strengthMetric === m }}
                      accessibilityLabel={strengthMetricLabel[m]}
                    >
                      <Text style={[styles.metricOptionText, strengthMetric === m && styles.metricOptionTextActive]}>
                        {strengthMetricLabel[m]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <ProgressChart
              points={chartPoints}
              unit={isCardio ? (cardioMetric === 'distance_km' ? distanceUnit : `min/${distanceUnit}`) : unit}
            />
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
    color: colors.text.onAccent,
  },
});
