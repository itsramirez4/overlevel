import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell, Pencil, Plus, Trash, Trash2 } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';

const categoryLabel: Record<string, string> = {
  compound: 'Compuesto',
  isolation: 'Aislamiento',
  cardio: 'Cardio',
};

export default function ManageExercisesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get('/exercises').then((r) => r.data),
  });

  const filteredExercises = (exercises || []).filter((e: any) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setError('');
    try {
      await api.delete(`/exercises/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo borrar el ejercicio');
    }
  };

  const goToTrash = () => router.push('/profile/exercise-trash');

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
        <Text style={styles.title} accessibilityRole="header">Ejercicios</Text>
        <TouchableOpacity
          onPress={goToTrash}
          hitSlop={10}
          style={[styles.headerActionButton, styles.headerActionButtonSpacing]}
          accessibilityLabel="Ver papelera"
        >
          <Trash size={18} color={colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/profile/exercise-edit')}
          hitSlop={10}
          style={styles.headerActionButton}
          accessibilityLabel="Crear ejercicio"
        >
          <Plus size={18} color={colors.accent.fire} strokeWidth={2.4} />
        </TouchableOpacity>
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
        data={filteredExercises}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={Dumbbell}
              title={search ? 'Sin resultados' : 'Sin ejercicios todavía'}
              message={search ? 'Prueba con otro nombre.' : 'Crea el primero con el botón de arriba.'}
            />
          )
        }
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Dumbbell size={16} color={colors.accent.fire} strokeWidth={2} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{categoryLabel[item.category] || item.category}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/profile/exercise-edit?id=${item.id}`)}
              hitSlop={8}
              style={styles.controlButton}
              accessibilityLabel={`Editar ${item.name}`}
            >
              <Pencil size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteTarget({ id: item.id, name: item.name })}
              hitSlop={8}
              style={styles.controlButton}
              accessibilityLabel={`Borrar ${item.name}`}
            >
              <Trash2 size={16} color={colors.semantic.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Borrar ejercicio"
        message={`"${deleteTarget?.name}" se moverá a la papelera junto con sus series y su sitio en tus rutinas. Podrás restaurarlo desde ahí cuando quieras.`}
        confirmLabel="Borrar"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
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
    flex: 1,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonSpacing: {
    marginRight: spacing.sm,
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
    color: colors.text.secondary,
    marginTop: 2,
  },
  controlButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
