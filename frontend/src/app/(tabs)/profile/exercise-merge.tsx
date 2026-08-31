import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Combine, Dumbbell } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { getErrorMessage } from '../../../utils/errors';
import { Exercise } from '../../../types';

/** Admin-only (the profile Ejercicios screen only links here for admins;
 * the backend re-checks regardless). Picks a survivor for the exercise
 * named in `name` (its id in `id`) to be absorbed into. */
export default function ExerciseMergeScreen() {
  const { id: loserId, name: loserName } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [survivor, setSurvivor] = useState<Exercise | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<Exercise[]>('/exercises?scope=all').then((r) => r.data),
  });

  const candidates = (exercises || [])
    .filter((e) => e.id !== loserId)
    .filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));

  const confirmMerge = async () => {
    if (!survivor) return;
    setMerging(true);
    setError('');
    try {
      await api.post(`/exercises/${loserId}/merge`, { into: survivor.id });
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo fusionar el ejercicio'));
      setSurvivor(null);
    } finally {
      setMerging(false);
    }
  };

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
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          Fusionar &quot;{loserName}&quot;
        </Text>
      </View>

      <View style={styles.explainer}>
        <Text style={styles.explainerText}>
          Elige con qué ejercicio se fusiona. Todas las series y rutinas de &quot;{loserName}&quot; pasan a ser del
          elegido, y &quot;{loserName}&quot; se mueve a la papelera.
        </Text>
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.searchContainer}>
        <Input placeholder="Buscar ejercicio…" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading ? null : <EmptyState icon={Combine} title="Sin resultados" message="Prueba con otro nombre." />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
            <TouchableOpacity style={styles.card} onPress={() => setSurvivor(item)} activeOpacity={0.7}>
              <View style={styles.iconBadge}>
                <Dumbbell size={16} color={colors.accent.fire} strokeWidth={2} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.users?.username ? <Text style={styles.meta}>de @{item.users.username}</Text> : null}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />

      <ConfirmDialog
        visible={!!survivor}
        title="Fusionar ejercicios"
        message={`"${loserName}" se fusionará con "${survivor?.name}". Esto no se puede deshacer directamente (aunque "${loserName}" queda recuperable desde la papelera, ya sin sus series ni rutinas).`}
        confirmLabel={merging ? 'Fusionando…' : 'Fusionar'}
        loading={merging}
        destructive
        onConfirm={confirmMerge}
        onCancel={() => setSurvivor(null)}
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
    marginBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    flex: 1,
  },
  explainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  explainerText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
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
    color: colors.text.muted,
    marginTop: 2,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
