import { useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronUp, Copy, ListChecks, Pencil, Trash2, X } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { authStore } from '../../../stores/authStore';
import { formatWeight } from '../../../utils/units';
import { Routine, RoutineExercise } from '../../../types';

// != null, not a truthy check — a target_weight/target_reps of 0 (a
// bodyweight exercise target) is real and must still show, not disappear.
const formatTarget = (item: RoutineExercise, unit: 'kg' | 'lbs'): string =>
  [
    item.target_sets ? `${item.target_sets} sets` : null,
    item.target_weight != null ? formatWeight(item.target_weight, unit) : null,
    item.target_reps != null ? `${item.target_reps} reps` : null,
  ]
    .filter(Boolean)
    .join(' × ') || 'Sin objetivo definido';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteRoutineOpen, setDeleteRoutineOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const { data: routine, isLoading, isError, refetch } = useQuery({
    queryKey: ['routines', id],
    queryFn: () => api.get<Routine>(`/routines/${id}`).then((r) => r.data),
  });

  const exercises = (routine?.routine_exercises || []).slice().sort((a, b) => a.order_num - b.order_num);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['routines', id] });

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const { data: copy } = await api.post<Routine>(`/routines/${id}/duplicate`);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      router.replace(`/routines/${copy.id}`);
    } catch {
      Alert.alert('Error', 'No se pudo duplicar la rutina. Inténtalo de nuevo.');
    } finally {
      setDuplicating(false);
    }
  };

  const confirmDeleteRoutine = async () => {
    try {
      await api.delete(`/routines/${id}`);
      setDeleteRoutineOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      router.replace('/routines');
    } catch {
      setDeleteRoutineOpen(false);
      Alert.alert('Error', 'No se pudo borrar la rutina. Inténtalo de nuevo.');
    }
  };

  const confirmRemoveExercise = async () => {
    if (!removeTarget) return;
    const routineExerciseId = removeTarget.id;
    setRemoveTarget(null);
    setBusyId(routineExerciseId);
    try {
      await api.delete(`/routines/${id}/exercises/${routineExerciseId}`);
      await invalidate();
    } catch {
      Alert.alert('Error', 'No se pudo quitar el ejercicio. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const reordered = exercises.slice();
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setBusyId(exercises[index].id);
    try {
      await api.put(`/routines/${id}/exercises/reorder`, {
        order: reordered.map((re) => re.id),
      });
      await invalidate();
    } catch {
      Alert.alert('Error', 'No se pudo reordenar. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
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
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {isLoading ? 'Rutina' : routine?.name}
        </Text>
        {!isLoading && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push(`/routines/edit?id=${id}`)}
              hitSlop={10}
              style={styles.headerActionButton}
              accessibilityLabel="Editar rutina"
            >
              <Pencil size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDuplicate}
              disabled={duplicating}
              hitSlop={10}
              style={[styles.headerActionButton, duplicating && styles.headerActionButtonBusy]}
              accessibilityLabel="Duplicar rutina"
            >
              <Copy size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteRoutineOpen(true)}
              hitSlop={10}
              style={styles.headerActionButton}
              accessibilityLabel="Borrar rutina"
            >
              <Trash2 size={18} color={colors.semantic.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Button
            label="AÑADIR EJERCICIO"
            variant="outline"
            onPress={() => router.push(`/routines/add-exercise?routineId=${id}`)}
            style={styles.addButton}
          />
        }
        ListEmptyComponent={
          isLoading ? null : isError ? (
            <EmptyState
              icon={ListChecks}
              title="No se pudo cargar"
              message="Revisa tu conexión e inténtalo de nuevo."
              onRetry={refetch}
            />
          ) : (
            <EmptyState
              icon={ListChecks}
              title="Sin ejercicios"
              message="Añade ejercicios a esta rutina para verlos aquí."
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 50).duration(250)}
            style={[styles.exerciseCard, busyId === item.id && styles.exerciseCardBusy]}
          >
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.exercises?.name}</Text>
              <Text style={styles.exerciseMeta}>{formatTarget(item, unit)}</Text>
            </View>
            <View style={styles.exerciseControls}>
              <TouchableOpacity
                onPress={() => handleMove(index, -1)}
                disabled={index === 0}
                hitSlop={6}
                style={styles.controlButton}
                accessibilityLabel={`Subir ${item.exercises?.name}`}
              >
                <ChevronUp size={16} color={index === 0 ? colors.text.muted : colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMove(index, 1)}
                disabled={index === exercises.length - 1}
                hitSlop={6}
                style={styles.controlButton}
                accessibilityLabel={`Bajar ${item.exercises?.name}`}
              >
                <ChevronDown
                  size={16}
                  color={index === exercises.length - 1 ? colors.text.muted : colors.text.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRemoveTarget({ id: item.id, name: item.exercises?.name || '' })}
                hitSlop={6}
                style={styles.controlButton}
                accessibilityLabel={`Quitar ${item.exercises?.name}`}
              >
                <X size={16} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      />

      <ConfirmDialog
        visible={deleteRoutineOpen}
        title="Borrar rutina"
        message={`"${routine?.name}" se moverá a la papelera. Podrás restaurarla desde ahí cuando quieras.`}
        confirmLabel="Borrar"
        destructive
        onConfirm={confirmDeleteRoutine}
        onCancel={() => setDeleteRoutineOpen(false)}
      />

      <ConfirmDialog
        visible={!!removeTarget}
        title="Quitar ejercicio"
        message={`¿Quitar "${removeTarget?.name}" de la rutina?`}
        confirmLabel="Quitar"
        destructive
        onConfirm={confirmRemoveExercise}
        onCancel={() => setRemoveTarget(null)}
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonBusy: {
    opacity: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  exerciseCard: {
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
  exerciseCardBusy: {
    opacity: 0.5,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  orderText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '800',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  exerciseMeta: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
  exerciseControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
