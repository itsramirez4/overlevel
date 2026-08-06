import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronUp, ListChecks, Pencil, Trash2, X } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { authStore } from '../../../stores/authStore';
import { formatWeight } from '../../../utils/units';

const formatTarget = (item: any, unit: 'kg' | 'lbs'): string =>
  [
    item.target_sets ? `${item.target_sets} sets` : null,
    item.target_weight ? formatWeight(item.target_weight, unit) : null,
    item.target_reps ? `${item.target_reps} reps` : null,
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

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routines', id],
    queryFn: () => api.get(`/routines/${id}`).then((r) => r.data),
  });

  const exercises = (routine?.routine_exercises || []).slice().sort((a: any, b: any) => a.order_num - b.order_num);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['routines', id] });

  const confirmDeleteRoutine = async () => {
    setDeleteRoutineOpen(false);
    await api.delete(`/routines/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['routines'] });
    router.replace('/routines');
  };

  const confirmRemoveExercise = async () => {
    if (!removeTarget) return;
    const routineExerciseId = removeTarget.id;
    setRemoveTarget(null);
    setBusyId(routineExerciseId);
    try {
      await api.delete(`/routines/${id}/exercises/${routineExerciseId}`);
      await invalidate();
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
        order: reordered.map((re: any) => re.id),
      });
      await invalidate();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
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
        keyExtractor={(item: any) => item.id}
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
          isLoading ? null : (
            <EmptyState
              icon={ListChecks}
              title="Sin ejercicios"
              message="Añade ejercicios a esta rutina para verlos aquí."
            />
          )
        }
        renderItem={({ item, index }: any) => (
          <View style={[styles.exerciseCard, busyId === item.id && styles.exerciseCardBusy]}>
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
                onPress={() => setRemoveTarget({ id: item.id, name: item.exercises?.name })}
                hitSlop={6}
                style={styles.controlButton}
                accessibilityLabel={`Quitar ${item.exercises?.name}`}
              >
                <X size={16} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <ConfirmDialog
        visible={deleteRoutineOpen}
        title="Borrar rutina"
        message={`¿Seguro que quieres borrar "${routine?.name}"? Esta acción no se puede deshacer.`}
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
