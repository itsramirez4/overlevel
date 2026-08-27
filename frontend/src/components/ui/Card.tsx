import { ViewProps, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, radius, shadow, spacing } from '../../utils/theme';

export const Card = ({ style, ...props }: ViewProps) => (
  <Animated.View entering={FadeIn.duration(300)} style={[styles.card, style]} {...props} />
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
