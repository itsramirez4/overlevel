import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { VolumeChart } from '../../../components/analytics/VolumeChart';
import { downloadOrShareJson } from '../../../services/dataExport';
import { authStore } from '../../../stores/authStore';

type WeightUnit = 'kg' | 'lbs';
type DistanceUnit = 'km' | 'mi';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  useEffect(() => {
    if (user?.distance_unit) setDistanceUnit(user.distance_unit);
  }, [user?.distance_unit]);

  const chartData = (weightHistory || []).slice(-8).map((log: any) => ({
    label: new Date(log.logged_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    volume: Number(log.weight),
  }));

  const handleSave = async () => {
    setSaveError('');
    const parsedBodyWeight = bodyWeight.trim() ? parseFloat(bodyWeight) : undefined;
    if (bodyWeight.trim() && !Number.isFinite(parsedBodyWeight)) {
      setSaveError('El peso corporal no es un número válido');
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await api.put('/users/me', {
        body_weight: parsedBodyWeight,
        weight_unit: weightUnit,
        distance_unit: distanceUnit,
      });
      await queryClient.invalidateQueries({ queryKey: ['users', 'body-weight-history'] });
      authStore.setState((s) =>
        s.user ? { user: { ...s.user, weight_unit: weightUnit, distance_unit: distanceUnit } } : {}
      );
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectUnit = (unit: WeightUnit) => {
    setWeightUnit(unit);
    setSaved(false);
    setSaveError('');
  };

  const handleSelectDistanceUnit = (unit: DistanceUnit) => {
    setDistanceUnit(unit);
    setSaved(false);
    setSaveError('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSaved(false);

    if (!currentPassword || !newPassword) {
      setPasswordError('Rellena ambos campos');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      const { data } = await api.get('/users/me/export');
      const date = new Date().toISOString().split('T')[0];
      await downloadOrShareJson(`overlevel-export-${date}.json`, data);
    } catch (err: any) {
      setExportError(err.response?.data?.message || 'No se pudieron exportar los datos');
    } finally {
      setExporting(false);
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
        <Text style={styles.title} accessibilityRole="header">Ajustes</Text>
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
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {unit.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Unidad de distancia</Text>
        <View style={styles.chipsRow}>
          {(['km', 'mi'] as DistanceUnit[]).map((unit) => {
            const selected = unit === distanceUnit;
            return (
              <TouchableOpacity
                key={unit}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => handleSelectDistanceUnit(unit)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected }}
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
            setSaveError('');
          }}
          keyboardType="decimal-pad"
        />

        {saveError ? (
          <Text style={styles.passwordError} accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}
        {saved && (
          <Text style={styles.savedText} accessibilityLiveRegion="polite">
            Guardado ✓
          </Text>
        )}

        <Button
          label={saving ? 'Guardando…' : 'GUARDAR'}
          loading={saving}
          onPress={handleSave}
        />

        {chartData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Evolución del peso corporal</Text>
            <VolumeChart data={chartData} unit={weightUnit} title="Evolución del peso corporal" />
          </Card>
        )}

        <Card style={styles.passwordCard}>
          <Text style={styles.chartTitle}>Cambiar contraseña</Text>

          <Input
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              setPasswordSaved(false);
            }}
            secureTextEntry
          />
          <Input
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setPasswordSaved(false);
            }}
            secureTextEntry
          />
          <Input
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setPasswordSaved(false);
            }}
            secureTextEntry
          />

          {passwordError ? (
            <Text style={styles.passwordError} accessibilityLiveRegion="polite">
              {passwordError}
            </Text>
          ) : null}
          {passwordSaved && (
            <Text style={styles.savedText} accessibilityLiveRegion="polite">
              Contraseña actualizada ✓
            </Text>
          )}

          <Button
            label={passwordSaving ? 'Guardando…' : 'CAMBIAR CONTRASEÑA'}
            loading={passwordSaving}
            onPress={handleChangePassword}
          />
        </Card>

        <Card style={styles.dataCard}>
          <Text style={styles.chartTitle}>Datos</Text>

          {exportError ? (
            <Text style={styles.passwordError} accessibilityLiveRegion="polite">
              {exportError}
            </Text>
          ) : null}

          <Button
            label={exporting ? 'Exportando…' : 'EXPORTAR MIS DATOS'}
            variant="outline"
            loading={exporting}
            onPress={handleExport}
          />

          <TouchableOpacity
            style={styles.importRow}
            onPress={() => router.push('/profile/import-hevy')}
            activeOpacity={0.7}
          >
            <Text style={styles.importRowText}>Importar desde Hevy</Text>
            <ChevronRight size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </Card>
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
  passwordCard: {
    marginTop: spacing.xl,
  },
  dataCard: {
    marginTop: spacing.xl,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  importRowText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  passwordError: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
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
