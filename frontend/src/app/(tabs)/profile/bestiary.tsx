import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Skull } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Loader } from '../../../components/ui/Loader';

interface BestiaryEntry {
  exercise_id: string;
  exercise_name: string;
  category: string;
  times_defeated: number;
  first_defeated_at: string;
  last_defeated_at: string;
}

export default function BestiaryScreen() {
  const router = useRouter();

  const { data: entries, isLoading } = useQuery<BestiaryEntry[]>({
    queryKey: ['battles', 'bestiary'],
    queryFn: () => api.get('/battles/bestiary').then((r) => r.data),
  });

  const totalKills = (entries || []).reduce((sum, e) => sum + e.times_defeated, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">Bestiario</Text>
          {!isLoading && (
            <Text style={styles.subtitle}>
              {totalKills} {totalKills === 1 ? 'enemigo derrotado' : 'enemigos derrotados'} en total
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.exercise_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={Skull}
              title="Sin derrotas todavía"
              message="Termina un entrenamiento para empezar a llenar tu bestiario."
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(250)} style={styles.card}>
              <View style={styles.iconBadge} accessibilityLabel="Enemigo derrotado">
                <Skull size={18} color={colors.semantic.error} strokeWidth={1.8} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.exercise_name}
                </Text>
                <Text style={styles.meta}>
                  Última vez:{' '}
                  {new Date(item.last_defeated_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>×{item.times_defeated}</Text>
              </View>
            </Animated.View>
          )}
        />
      )}
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
  headerText: {
    flexShrink: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
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
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  meta: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  countBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: `${colors.semantic.error}1a`,
  },
  countText: {
    ...typography.small,
    color: colors.semantic.error,
    fontWeight: '800',
  },
});
