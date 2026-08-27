import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';
import { Logo } from './Logo';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showLogo?: boolean;
}

export const Header = ({ title, subtitle, action, showLogo }: HeaderProps) => (
  <View style={styles.wrapper}>
    {showLogo && <Logo variant="horizontal" size="sm" />}
    <View style={[styles.row, showLogo && styles.rowWithLogo]}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowWithLogo: {
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
