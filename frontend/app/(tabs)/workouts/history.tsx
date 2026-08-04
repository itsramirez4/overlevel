import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';

export default function WorkoutHistoryScreen() {
  const router = useRouter();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', 'history'],
    queryFn: () => api.get('/workouts').then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Historial</Text>
      </View>

      <FlatList
        data={workouts || []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon={Dumbbell} title="Sin entrenamientos" message="Aún no has completado ninguno." />
          )
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/workouts/detail?id=${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.iconBadge}>
              <Dumbbell size={16} color={colors.accent.fire} strokeWidth={2} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.date}>
                {new Date(item.started_at).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Text style={styles.sets}>{item.sets?.length || 0} sets</Text>
            </View>
            <ChevronRight size={18} color={colors.text.muted} />
          </TouchableOpacity>
        )}
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
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
  sets: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
