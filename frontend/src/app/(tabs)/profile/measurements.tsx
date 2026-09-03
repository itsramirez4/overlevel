import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Ruler, X } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { getErrorMessage } from '../../../utils/errors';
import { BodyMeasurement } from '../../../types';

const FIELDS: { key: keyof BodyMeasurement; label: string; suffix: string }[] = [
  { key: 'waist_cm', label: 'Cintura', suffix: 'cm' },
  { key: 'chest_cm', label: 'Pecho', suffix: 'cm' },
  { key: 'hips_cm', label: 'Cadera', suffix: 'cm' },
  { key: 'bicep_cm', label: 'Bíceps', suffix: 'cm' },
  { key: 'thigh_cm', label: 'Muslo', suffix: 'cm' },
  { key: 'neck_cm', label: 'Cuello', suffix: 'cm' },
  { key: 'body_fat_pct', label: '% Grasa corporal', suffix: '%' },
];

const formatEntry = (item: BodyMeasurement): string =>
  FIELDS.filter((f) => item[f.key] != null)
    .map((f) => `${f.label} ${item[f.key]}${f.suffix}`)
    .join(' · ') || 'Sin datos';

export default function MeasurementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; summary: string } | null>(null);

  const { data: measurements, isLoading } = useQuery<BodyMeasurement[]>({
    queryKey: ['users', 'measurements'],
    queryFn: () => api.get<BodyMeasurement[]>('/users/me/measurements').then((r) => r.data),
  });

  const handleSave = async () => {
    setError('');
    const payload: Record<string, number> = {};
    for (const field of FIELDS) {
      const raw = values[field.key]?.trim();
      if (!raw) continue;
      const parsed = parseFloat(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Las medidas deben ser números mayores que cero');
        return;
      }
      payload[field.key] = parsed;
    }
    if (Object.keys(payload).length === 0) {
      setError('Introduce al menos una medida');
      return;
    }

    setSaving(true);
    try {
      await api.post('/users/me/measurements', payload);
      setValues({});
      await queryClient.invalidateQueries({ queryKey: ['users', 'measurements'] });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await api.delete(`/users/me/measurements/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['users', 'measurements'] });
    } catch {
      setError('No se pudo borrar la medida');
    }
  };

  const sorted = (measurements || []).slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at));

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
          Medidas corporales
        </Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Nueva medición</Text>
            <View style={styles.grid}>
              {FIELDS.map((field) => (
                <View key={field.key} style={styles.gridItem}>
                  <Input
                    label={`${field.label} (${field.suffix})`}
                    placeholder="0"
                    value={values[field.key] || ''}
                    onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button label={saving ? 'Guardando…' : 'GUARDAR'} loading={saving} onPress={handleSave} />
          </Card>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={Ruler}
              title="Sin medidas todavía"
              message="Registra tu primera medición arriba para empezar a ver tu evolución."
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(250)} style={styles.entryCard}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryDate}>
                {new Date(item.logged_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.entrySummary}>{formatEntry(item)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setDeleteTarget({ id: item.id, summary: formatEntry(item) })}
              hitSlop={8}
              style={styles.deleteButton}
              accessibilityLabel="Borrar medida"
            >
              <X size={16} color={colors.semantic.error} />
            </TouchableOpacity>
          </Animated.View>
        )}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Borrar medida"
        message={`¿Borrar esta medición (${deleteTarget?.summary})? Esta acción no se puede deshacer.`}
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  entryCard: {
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
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  entrySummary: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
