import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { VolumeChart } from '../../../components/analytics/VolumeChart';

type WeightUnit = 'kg' | 'lbs';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bodyWeight, setBodyWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');

  const { data: user } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  });

  const { data: weightHistory } = useQuery({
    queryKey: ['users', 'body-weight-history'],
    queryFn: () => api.get('/users/me/body-weight-history?days=90').then((r) => r.data),
  });

  useEffect(() => {
    if (user?.weight_unit) setWeightUnit(user.weight_unit);
  }, [user?.weight_unit]);

  const chartData = (weightHistory || []).slice(-8).map((log: any) => ({
    label: new Date(log.logged_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    volume: Number(log.weight),
  }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/users/me', {
        body_weight: parseFloat(bodyWeight) || undefined,
        weight_unit: weightUnit,
      });
      await queryClient.invalidateQueries({ queryKey: ['users', 'body-weight-history'] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectUnit = (unit: WeightUnit) => {
    setWeightUnit(unit);
    setSaved(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.label}>Unidad de peso</Text>
        <View style={styles.chipsRow}>
          {(['kg', 'lbs'] as WeightUnit[]).map((unit) => {
            const selected = unit === weightUnit;
            return (
              <TouchableOpacity
                key={unit}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => handleSelectUnit(unit)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {unit.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label={`Peso corporal (${weightUnit})`}
          placeholder={user?.body_weight?.toString() || '0'}
          value={bodyWeight}
          onChangeText={(text) => {
            setBodyWeight(text);
            setSaved(false);
          }}
          keyboardType="decimal-pad"
        />

        {saved && <Text style={styles.savedText}>Guardado ✓</Text>}

        <Button
          label={saving ? 'Guardando…' : 'GUARDAR'}
          loading={saving}
          onPress={handleSave}
        />

        {chartData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Evolución del peso corporal</Text>
            <VolumeChart data={chartData} unit={weightUnit} />
          </Card>
        )}
      </ScrollView>
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
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentInner: {
    paddingBottom: spacing.xxl,
  },
  chartCard: {
    marginTop: spacing.xl,
  },
  chartTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: colors.accent.fire,
    backgroundColor: `${colors.accent.fire}1a`,
  },
  chipText: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.accent.fire,
  },
  savedText: {
    ...typography.small,
    color: colors.semantic.success,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
});
