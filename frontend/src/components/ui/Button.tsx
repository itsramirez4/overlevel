import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Primary is already red, so its press feedback darkens; outline/ghost are
// transparent, so theirs tints red instead — same overlay technique either
// way, just a different target color.
const OVERLAY_COLOR: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'rgba(0, 0, 0, 0.15)',
  outline: 'rgba(255, 90, 74, 0.12)',
  ghost: 'rgba(255, 90, 74, 0.12)',
};

export const Button = ({ label, onPress, loading, disabled, variant = 'primary', style }: ButtonProps) => {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: pressed.value,
  }));

  return (
    <AnimatedPressable
      style={[
        styles.button,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        variant === 'primary' && !isDisabled && shadow.glow,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 100 });
        pressed.value = withTiming(1, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 100 });
        pressed.value = withTiming(0, { duration: 100 });
      }}
      android_ripple={{ color: OVERLAY_COLOR[variant] }}
      disabled={isDisabled}
      accessibilityRole="button"
      // While loading, only the ActivityIndicator renders — without an
      // explicit label a screen reader would announce nothing at all for
      // the button's name during that state.
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, { backgroundColor: OVERLAY_COLOR[variant], borderRadius: radius.md }, overlayStyle]}
      />
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.text.primary : colors.accent.fire} />
      ) : (
        <Text style={[styles.text, variant !== 'primary' && styles.tintedText]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent.fire,
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.accent.fire,
    borderWidth: 1.5,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.h3,
    color: colors.text.primary,
  },
  tintedText: {
    color: colors.accent.fire,
  },
});
