import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../utils/theme';

interface LoaderProps {
  label?: string;
}

export const Loader = ({ label = 'Cargando…' }: LoaderProps) => (
  <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
    <ActivityIndicator size="large" color={colors.accent.fire} />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.small,
    color: colors.text.secondary,
  },
});
