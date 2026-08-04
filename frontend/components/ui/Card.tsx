import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../../utils/theme';

export const Card = ({ style, ...props }: ViewProps) => (
  <View style={[styles.card, style]} {...props} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.card,
  },
});
