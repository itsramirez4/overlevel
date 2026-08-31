import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Skull, Trophy, Zap } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface XpRewardDialogProps {
  visible: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  /** Names of exercises defeated this session — omit/empty to skip the section. */
  defeatedEnemies?: string[];
  onClose: () => void;
}

export const XpRewardDialog = ({
  visible,
  xpGained,
  leveledUp,
  newLevel,
  defeatedEnemies = [],
  onClose,
}: XpRewardDialogProps) => {
  // Routine XP is common (every workout); leveling up isn't — the badge
  // gets a small entrance punch specifically for that rarer moment instead
  // of on every completion, so it still reads as special when it happens.
  const scale = useSharedValue(leveledUp ? 0.4 : 1);

  useEffect(() => {
    if (!leveledUp) return;
    scale.value = withDelay(150, withSequence(withSpring(1.15, { damping: 5 }), withTiming(1, { duration: 150 })));
  }, [leveledUp, scale]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.center} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Animated.View
          style={[styles.iconBadge, leveledUp && styles.iconBadgeLevelUp, badgeAnimatedStyle]}
        >
          {leveledUp ? (
            <Trophy size={36} color={colors.accent.gold} strokeWidth={2} />
          ) : (
            <Zap size={32} color={colors.accent.gold} strokeWidth={2} />
          )}
        </Animated.View>

        {leveledUp && <Text style={styles.levelUpText}>¡Subiste a nivel {newLevel}!</Text>}
        <Text style={styles.xpText}>+{xpGained} XP</Text>
        <Text style={styles.subtitle}>Por completar este entrenamiento</Text>

        {defeatedEnemies.length > 0 && (
          <View style={styles.enemiesSection}>
            <Text style={styles.enemiesTitle}>
              {defeatedEnemies.length === 1 ? 'Enemigo derrotado' : `${defeatedEnemies.length} enemigos derrotados`}
            </Text>
            <View style={styles.enemiesList}>
              {defeatedEnemies.map((name) => (
                <View key={name} style={styles.enemyChip}>
                  <Skull size={12} color={colors.semantic.error} strokeWidth={2} />
                  <Text style={styles.enemyChipText} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <Button label="CONTINUAR" onPress={onClose} style={styles.button} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconBadgeLevelUp: {
    width: 76,
    height: 76,
    borderWidth: 2,
    backgroundColor: `${colors.accent.gold}1a`,
  },
  levelUpText: {
    ...typography.h2,
    color: colors.accent.gold,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  xpText: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  enemiesSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  enemiesTitle: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  enemiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  enemyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    maxWidth: 180,
  },
  enemyChipText: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  button: {
    marginTop: spacing.sm,
  },
});
