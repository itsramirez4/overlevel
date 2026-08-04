import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../utils/theme';

interface BadgeProps {
  label: string;
  tone?: 'fire' | 'success' | 'warning' | 'neutral';
}

const toneColor: Record<NonNullable<BadgeProps['tone']>, string> = {
  fire: colors.accent.fire,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  neutral: colors.text.secondary,
};

export const Badge = ({ label, tone = 'fire' }: BadgeProps) => {
  const tint = toneColor[tone];
  return (
    <View style={[styles.badge, { borderColor: tint, backgroundColor: `${tint}1a` }]}>
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
