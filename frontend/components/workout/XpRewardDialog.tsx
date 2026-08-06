import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Zap } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface XpRewardDialogProps {
  visible: boolean;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  onClose: () => void;
}

export const XpRewardDialog = ({ visible, xpGained, leveledUp, newLevel, onClose }: XpRewardDialogProps) => (
  <Modal visible={visible} onClose={onClose}>
    <View style={styles.center}>
      <View style={[styles.iconBadge, leveledUp && styles.iconBadgeLevelUp]}>
        {leveledUp ? (
          <Trophy size={32} color={colors.accent.fire} strokeWidth={2} />
        ) : (
          <Zap size={32} color={colors.accent.fire} strokeWidth={2} />
        )}
      </View>

      {leveledUp && <Text style={styles.levelUpText}>¡Subiste a nivel {newLevel}!</Text>}
      <Text style={styles.xpText}>+{xpGained} XP</Text>
      <Text style={styles.subtitle}>Por completar este entrenamiento</Text>
    </View>

    <Button label="CONTINUAR" onPress={onClose} style={styles.button} />
  </Modal>
);

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
    borderColor: colors.accent.fire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconBadgeLevelUp: {
    backgroundColor: `${colors.accent.fire}1a`,
  },
  levelUpText: {
    ...typography.h3,
    color: colors.accent.fire,
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
  button: {
    marginTop: spacing.sm,
  },
});
