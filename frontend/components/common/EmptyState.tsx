import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
}

export const EmptyState = ({ title, message, icon: Icon }: EmptyStateProps) => (
  <View style={styles.container}>
    {Icon && (
      <View style={styles.iconBadge}>
        <Icon size={22} color={colors.text.muted} strokeWidth={1.8} />
      </View>
    )}
    <Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
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
});
