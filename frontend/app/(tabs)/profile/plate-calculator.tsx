import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { calculatePlates, defaultBarWeight, WeightUnit } from '../../../services/calculations';

export default function PlateCalculatorScreen() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  });

  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [target, setTarget] = useState('');
  const [barWeight, setBarWeight] = useState(defaultBarWeight('kg').toString());

  useEffect(() => {
    if (user?.weight_unit) {
      setUnit(user.weight_unit);
      setBarWeight(defaultBarWeight(user.weight_unit).toString());
    }
  }, [user?.weight_unit]);

  const handleSelectUnit = (nextUnit: WeightUnit) => {
    setUnit(nextUnit);
    setBarWeight(defaultBarWeight(nextUnit).toString());
  };

  const targetNum = parseFloat(target);
  const barNum = parseFloat(barWeight);
  const valid = !isNaN(targetNum) && !isNaN(barNum) && targetNum > 0 && barNum >= 0;
  const result = valid ? calculatePlates(targetNum, barNum, unit) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Calculadora de discos</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.label}>Unidad</Text>
        <View style={styles.chipsRow}>
          {(['kg', 'lbs'] as WeightUnit[]).map((u) => {
            const selected = u === unit;
            return (
              <TouchableOpacity
                key={u}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => handleSelectUnit(u)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{u.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label={`Peso objetivo (${unit})`}
              placeholder="100"
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.half}>
            <Input
              label={`Peso de la barra (${unit})`}
              value={barWeight}
              onChangeText={setBarWeight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {result && (
          <Card style={styles.resultCard}>
            {result.perSide.length === 0 ? (
              <Text style={styles.emptyText}>
                Con {barNum}
                {unit} de barra ya tienes suficiente — no hace falta añadir discos.
              </Text>
            ) : (
              <>
                <Text style={styles.resultTitle}>Discos por lado</Text>
                {result.perSide.map((p) => (
                  <View key={p.plate} style={styles.plateRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>{p.plate}</Text>
                    </View>
                    <Text style={styles.plateCount}>× {p.count}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total conseguido</Text>
              <Text style={styles.totalValue}>
                {result.achievedTotal}
                {unit}
              </Text>
            </View>
            {result.remainder !== 0 && (
              <Text style={styles.remainderText}>
                No se puede llegar exacto a {targetNum}
                {unit} con estos discos (faltan {result.remainder}
                {unit}).
              </Text>
            )}
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
    flexShrink: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentInner: {
    paddingBottom: spacing.xxl,
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  resultCard: {
    marginTop: spacing.lg,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  plateBadge: {
    minWidth: 56,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    alignItems: 'center',
  },
  plateBadgeText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '800',
  },
  plateCount: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  totalLabel: {
    ...typography.small,
    color: colors.text.secondary,
  },
  totalValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  remainderText: {
    ...typography.tiny,
    color: colors.semantic.warning,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.small,
    color: colors.text.secondary,
  },
});
