import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, RotateCcw, Trash2, Trash } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Loader } from '../../../components/ui/Loader';

const categoryLabel: Record<string, string> = {
  compound: 'Compuesto',
  isolation: 'Aislamiento',
  cardio: 'Cardio',
};

export default function ExerciseTrashScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: trash, isLoading } = useQuery({
    queryKey: ['exercises', 'trash'],
    queryFn: () => api.get('/exercises/trash').then((r) => r.data),
  });

  const handleRestore = async (id: string) => {
    setError('');
    setRestoringId(id);
    try {
      await api.post(`/exercises/${id}/restore`);
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo restaurar el ejercicio');
    } finally {
      setRestoringId(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setError('');
    try {
      await api.delete(`/exercises/${id}/permanent`);
      await queryClient.invalidateQueries({ queryKey: ['exercises', 'trash'] });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar definitivamente');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Papelera</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={trash}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState icon={Trash} title="La papelera está vacía" message="Los ejercicios que borres aparecerán aquí." />
          }
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {categoryLabel[item.category] || item.category} · Borrado el{' '}
                  {new Date(item.deleted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRestore(item.id)}
                disabled={restoringId === item.id}
                hitSlop={8}
                style={styles.controlButton}
                accessibilityLabel={`Restaurar ${item.name}`}
              >
                <RotateCcw size={16} color={colors.accent.fire} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteTarget({ id: item.id, name: item.name })}
                hitSlop={8}
                style={styles.controlButton}
                accessibilityLabel={`Eliminar definitivamente ${item.name}`}
              >
                <Trash2 size={16} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar definitivamente"
        message={`"${deleteTarget?.name}" y todas sus series, rutinas y batallas asociadas se borrarán para siempre. Esto NO se puede deshacer.`}
        confirmLabel="Eliminar para siempre"
        destructive
        onConfirm={confirmPermanentDelete}
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
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    textAlign: 'center',
    marginBottom: spacing.md,
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
