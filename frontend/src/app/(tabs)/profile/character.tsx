import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell, Flame, Sparkles } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Loader } from '../../../components/ui/Loader';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { CharacterAvatar } from '../../../components/character/CharacterAvatar';
import { CharacterTypeDef } from '../../../types';
import { getErrorMessage } from '../../../utils/errors';
import { formatCharacterStat, getXpProgressLabel } from '../../../utils/character';

export default function CharacterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [changingType, setChangingType] = useState(false);

  const { data: character, isLoading: characterLoading } = useQuery({
    queryKey: ['character'],
    queryFn: () => api.get('/characters/me').then((r) => r.data),
  });

  const showPicker = !character || changingType;

  const { data: types, isLoading: typesLoading } = useQuery<CharacterTypeDef[]>({
    queryKey: ['character', 'types'],
    queryFn: () => api.get('/characters/types').then((r) => r.data),
    enabled: !characterLoading && showPicker,
  });

  const handleCreate = async () => {
    if (!selectedType) return;
    setError('');
    setCreating(true);
    try {
      if (changingType) {
        await api.put('/characters/me', { character_type: selectedType });
        setChangingType(false);
      } else {
        await api.post('/characters', { character_type: selectedType });
      }
      setSelectedType(null);
      await queryClient.invalidateQueries({ queryKey: ['character'] });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el personaje'));
    } finally {
      setCreating(false);
    }
  };

  if (characterLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader />
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title} accessibilityRole="header">Personaje</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {character && !changingType ? (
          <>
            <Card style={styles.sheetCard}>
              <View
                style={styles.avatarBadgeLarge}
                accessible
                accessibilityLabel={`Avatar de personaje: ${character.name}`}
              >
                <CharacterAvatar type={character.character_type} size={160} />
              </View>

              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderText}>
                  <Text style={styles.name}>{character.name}</Text>
                  <Text style={styles.tagline}>{character.type_info?.tagline}</Text>
                </View>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeLabel}>NIVEL</Text>
                  <Text style={styles.levelBadgeValue}>{character.level}</Text>
                </View>
              </View>

              <View style={styles.xpRow}>
                <ProgressBar progress={character.progress} height={10} />
                <Text style={styles.xpLabel}>{getXpProgressLabel(character)}</Text>
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <Card style={styles.statsCard}>
              <StatRow icon={Dumbbell} label="Fuerza" value={formatCharacterStat('fuerza', character.stats.fuerza)} />
              <StatRow icon={Flame} label="Resistencia" value={formatCharacterStat('resistencia', character.stats.resistencia)} />
              <StatRow
                icon={Sparkles}
                label="Constancia"
                value={formatCharacterStat('constancia', character.stats.constancia)}
                isLast
              />
            </Card>

            <Text style={styles.hint}>
              Las estadísticas y la experiencia se calculan automáticamente a partir de tus entrenamientos reales.
            </Text>

            <Button
              label="CAMBIAR DE CLASE"
              variant="outline"
              onPress={() => {
                setSelectedType(character.character_type);
                setChangingType(true);
              }}
              style={styles.changeClassButton}
            />
          </>
        ) : typesLoading ? (
          <Loader />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{changingType ? 'Elige tu nueva clase' : 'Elige tu clase'}</Text>
            {(types || []).map((type) => {
              const selected = type.id === selectedType;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, selected && styles.typeCardSelected]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.avatarBadge}>
                    <CharacterAvatar type={type.id} size={88} />
                  </View>
                  <View style={styles.typeCardText}>
                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeTagline}>{type.tagline}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Button
              label={creating ? 'Guardando…' : changingType ? 'CONFIRMAR CAMBIO' : 'CREAR PERSONAJE'}
              loading={creating}
              disabled={!selectedType}
              onPress={handleCreate}
              style={styles.createButton}
            />

            {changingType && (
              <Button
                label="CANCELAR"
                variant="ghost"
                onPress={() => {
                  setChangingType(false);
                  setSelectedType(null);
                  setError('');
                }}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const StatRow = ({
  icon: Icon,
  label,
  value,
  isLast,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string | number;
  isLast?: boolean;
}) => (
  <View style={[statRowStyles.row, !isLast && statRowStyles.rowBorder]}>
    <Icon size={18} color={colors.accent.ember} strokeWidth={2} />
    <Text style={statRowStyles.label}>{label}</Text>
    <Text style={statRowStyles.value}>{value}</Text>
  </View>
);

const statRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    ...typography.h3,
    color: colors.accent.fire,
  },
});

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
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sheetCard: {
    marginBottom: spacing.lg,
  },
  avatarBadgeLarge: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarBadge: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  sheetHeaderText: {
    flex: 1,
  },
  name: {
    ...typography.h2,
    color: colors.text.primary,
  },
  tagline: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  levelBadge: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  levelBadgeLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  levelBadgeValue: {
    ...typography.h2,
    color: colors.accent.fire,
  },
  xpRow: {
    gap: spacing.xs,
  },
  xpLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.tiny,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  changeClassButton: {
    marginTop: spacing.lg,
  },
  typeCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  typeCardSelected: {
    borderColor: colors.accent.fire,
    backgroundColor: `${colors.accent.fire}1a`,
  },
  typeCardText: {
    flex: 1,
  },
  typeName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  typeTagline: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },
  typeDescription: {
    ...typography.small,
    color: colors.text.secondary,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  createButton: {
    marginTop: spacing.sm,
  },
});
