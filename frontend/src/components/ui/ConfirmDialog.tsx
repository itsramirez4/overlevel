import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal visible={visible} onClose={onCancel}>
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    <View style={styles.actions}>
      <View style={styles.actionButton}>
        <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
      </View>
      <View style={styles.actionButton}>
        <Button
          label={confirmLabel}
          variant={destructive ? 'primary' : 'outline'}
          onPress={onConfirm}
          loading={loading}
          disabled={loading}
          style={destructive ? styles.destructiveButton : undefined}
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  destructiveButton: {
    backgroundColor: colors.semantic.error,
  },
});
