import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../../utils/theme';

interface BadgeProps {
  label: string;
  tone?: 'fire' | 'gold' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const toneColor: Record<NonNullable<BadgeProps['tone']>, string> = {
  fire: colors.accent.fire,
  gold: colors.accent.gold,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  neutral: colors.text.secondary,
};

const sizeStyles = {
  sm: { paddingVertical: 4, paddingHorizontal: 10, fontSize: typography.tiny.fontSize },
  md: { paddingVertical: 6, paddingHorizontal: 12, fontSize: typography.small.fontSize },
  lg: { paddingVertical: 8, paddingHorizontal: 16, fontSize: typography.h3.fontSize },
};

export const Badge = ({ label, tone = 'fire', size = 'sm', style }: BadgeProps) => {
  const tint = toneColor[tone];
  const sizing = sizeStyles[size];
  return (
    <View
      style={[
        styles.badge,
        { borderColor: tint, backgroundColor: `${tint}1a`, paddingVertical: sizing.paddingVertical, paddingHorizontal: sizing.paddingHorizontal },
        style,
      ]}
    >
      <Text style={[styles.label, { color: tint, fontSize: sizing.fontSize }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
