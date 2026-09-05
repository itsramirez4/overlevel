import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { Skeleton } from '../ui/Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Shows a pulsing placeholder instead of `value` — pass the eventual
   * value in anyway so the accessibility label degrades to just the label. */
  loading?: boolean;
  /** Override the auto-generated "{label}: {value}" accessibility label with something more specific. */
  accessibilityLabel?: string;
}

export const StatCard = ({ label, value, icon: Icon, loading, accessibilityLabel }: StatCardProps) => (
  <View
    style={styles.card}
    accessible
    accessibilityRole="image"
    accessibilityLabel={accessibilityLabel ?? (loading ? label : `${label}: ${value}`)}
  >
    <View style={styles.header} accessible={false} importantForAccessibility="no-hide-descendants">
      <Text style={styles.label}>{label}</Text>
      {Icon && <Icon size={16} color={colors.accent.fire} strokeWidth={2.2} />}
    </View>
    {loading ? <Skeleton width={40} height={22} style={styles.valueSkeleton} /> : <Text style={styles.value}>{value}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.tiny,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    ...typography.h2,
    color: colors.text.primary,
  },
  valueSkeleton: {
    marginTop: 2,
  },
});
