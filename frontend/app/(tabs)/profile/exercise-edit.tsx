import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, spacing, typography } from '../../../utils/theme';
import { ExerciseForm } from '../../../components/forms/ExerciseForm';
import { Loader } from '../../../components/ui/Loader';

export default function ExerciseEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercises', id],
    queryFn: () => api.get(`/exercises/${id}`).then((r) => r.data),
    enabled: isEditing,
  });

  const handleSave = async (data: {
    name: string;
    category: string;
    notes?: string;
    muscle_groups?: string[];
  }) => {
    if (!data.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/exercises/${id}`, data);
      } else {
        await api.post('/exercises', data);
      }
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo guardar el ejercicio');
    } finally {
      setLoading(false);
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
        <Text style={styles.title} accessibilityRole="header">
          {isEditing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        </Text>
      </View>

      {isEditing && isLoading ? (
        <Loader />
      ) : (
        <View style={styles.content}>
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <ExerciseForm
            onSubmit={handleSave}
            loading={loading}
            submitLabel={isEditing ? 'GUARDAR CAMBIOS' : undefined}
            initialValues={
              isEditing && exercise
                ? {
                    name: exercise.name,
                    category: exercise.category,
                    notes: exercise.notes || '',
                    muscle_groups: exercise.muscle_groups || [],
                  }
                : undefined
            }
          />
        </View>
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
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
