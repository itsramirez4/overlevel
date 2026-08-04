import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

export const StatCard = ({ label, value, icon: Icon }: StatCardProps) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.label}>{label}</Text>
      {Icon && <Icon size={16} color={colors.accent.fire} strokeWidth={2.2} />}
    </View>
    <Text style={styles.value}>{value}</Text>
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
});
