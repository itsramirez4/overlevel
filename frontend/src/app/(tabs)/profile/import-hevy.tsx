import { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { getErrorMessage } from '../../../utils/errors';

interface ImportResult {
  workouts_created: number;
  exercises_created: number;
  sets_created: number;
  rows_skipped: number;
  duplicate_workouts_skipped: number;
}

export default function ImportHevyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const handlePickFileWeb = () => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.style.display = 'none';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          setCsv(String(reader.result || ''));
          setResult(null);
          setError('');
        };
        reader.readAsText(file);
      };
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.click();
  };

  const handlePickFileNative = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;

      const content = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      setCsv(content);
      setResult(null);
      setError('');
    } catch {
      setError('No se pudo leer el archivo seleccionado');
    }
  };

  const handlePickFile = () => (Platform.OS === 'web' ? handlePickFileWeb() : handlePickFileNative());

  const handleImport = async () => {
    if (!csv.trim()) {
      setError('Pega o selecciona el CSV exportado de Hevy primero');
      return;
    }

    setError('');
    setResult(null);
    setImporting(true);
    try {
      const { data } = await api.post<ImportResult>('/users/me/import/hevy', { csv });
      setResult(data);
      await queryClient.invalidateQueries();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo importar el archivo'));
    } finally {
      setImporting(false);
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
        <Text style={styles.title} accessibilityRole="header">Importar desde Hevy</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.instructions}>
          En Hevy: Perfil → icono de engranaje → Exportar e importar datos → Exportar entrenamientos. Luego
          selecciona el CSV aquí abajo, o pega su contenido directamente.
        </Text>

        <TouchableOpacity style={styles.fileButton} onPress={handlePickFile} activeOpacity={0.7}>
          <Upload size={18} color={colors.accent.fire} strokeWidth={2.4} />
          <Text style={styles.fileButtonText}>Seleccionar archivo CSV</Text>
        </TouchableOpacity>

        <Input
          label="Contenido del CSV"
          placeholder="title,start_time,end_time,exercise_title,..."
          value={csv}
          onChangeText={(text) => {
            setCsv(text);
            setResult(null);
          }}
          multiline
          style={styles.csvInput}
        />

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {result && (
          <Card style={styles.resultCard} accessibilityLiveRegion="polite">
            <Text style={styles.resultTitle}>Importación completa</Text>
            <Text style={styles.resultLine}>Entrenamientos creados: {result.workouts_created}</Text>
            <Text style={styles.resultLine}>Ejercicios nuevos: {result.exercises_created}</Text>
            <Text style={styles.resultLine}>Series creadas: {result.sets_created}</Text>
            {result.rows_skipped > 0 && (
              <Text style={styles.resultLine}>Filas omitidas: {result.rows_skipped}</Text>
            )}
            {result.duplicate_workouts_skipped > 0 && (
              <Text style={styles.resultLine}>
                Entrenamientos ya importados (omitidos): {result.duplicate_workouts_skipped}
              </Text>
            )}
          </Card>
        )}

        <Button
          label={importing ? 'Importando…' : 'IMPORTAR'}
          loading={importing}
          onPress={handleImport}
          style={styles.importButton}
        />
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
  instructions: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fileButtonText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '700',
  },
  csvInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 12,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resultCard: {
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  resultLine: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  importButton: {
    marginTop: spacing.sm,
  },
});
