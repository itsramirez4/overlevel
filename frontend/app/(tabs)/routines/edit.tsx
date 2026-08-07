import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, spacing, typography } from '../../../utils/theme';
import { RoutineForm } from '../../../components/forms/RoutineForm';
import { Loader } from '../../../components/ui/Loader';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routines', id],
    queryFn: () => api.get(`/routines/${id}`).then((r) => r.data),
  });

  const handleSave = async (data: {
    name: string;
    day_of_week?: string;
    pattern?: 'fixed_day' | 'alternating_ab' | 'alternating_abc';
    notes?: string;
  }) => {
    if (!data.name) {
      setError('El nombre es obligatorio');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.put(`/routines/${id}`, data);
      await queryClient.invalidateQueries({ queryKey: ['routines', id] });
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo guardar la rutina');
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
          Editar rutina
        </Text>
      </View>

      {isLoading ? (
        <Loader />
      ) : (
        <View style={styles.content}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <RoutineForm
            onSubmit={handleSave}
            loading={loading}
            submitLabel="GUARDAR CAMBIOS"
            initialValues={{
              name: routine?.name || '',
              day_of_week: routine?.day_of_week || '',
              pattern: routine?.pattern,
              notes: routine?.notes || '',
            }}
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
