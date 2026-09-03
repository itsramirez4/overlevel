import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
  /** Shows a "Reintentar" action below the message — pass a query's
   * refetch() when this state might mean "the request failed", not just
   * "there's genuinely nothing here yet". */
  onRetry?: () => void;
}

export const EmptyState = ({ title, message, icon: Icon, onRetry }: EmptyStateProps) => (
  <View style={styles.container} accessible accessibilityLabel={[title, message].filter(Boolean).join('. ')}>
    {Icon && (
      <View style={styles.iconBadge}>
        <Icon size={22} color={colors.text.muted} strokeWidth={1.8} />
      </View>
    )}
    <Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {onRetry && (
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
  },
  retryText: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '700',
  },
});
