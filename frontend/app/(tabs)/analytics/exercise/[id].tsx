import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronLeft, Dumbbell, Flame, Trophy } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, spacing, typography } from '../../../../utils/theme';
import { StatCard } from '../../../../components/analytics/StatCard';

export default function ExerciseAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', 'exercise', id],
    queryFn: () => api.get(`/analytics/exercise/${id}`).then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{isLoading ? 'Ejercicio' : stats?.name}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <StatCard
            label="1RM estimado"
            value={stats?.estimated_1rm ? `${Math.round(stats.estimated_1rm)}kg` : '—'}
            icon={Trophy}
          />
          <StatCard
            label="Peso máximo"
            value={stats?.max_weight ? `${stats.max_weight}kg` : '—'}
            icon={Dumbbell}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Volumen total"
            value={stats?.total_volume ? `${Math.round(stats.total_volume)}kg` : '—'}
            icon={Flame}
          />
          <StatCard label="RPE medio" value={stats?.avg_rpe ?? '—'} icon={Activity} />
        </View>
      </View>
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
