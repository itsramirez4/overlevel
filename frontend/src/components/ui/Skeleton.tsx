import { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '../../utils/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A pulsing placeholder block, shaped like the content it stands in for —
 * used instead of a spinner/blank gap so the layout the data will land in
 * is visible immediately or a "—" that reads as a value rather than a
 * loading state.
 */
export const Skeleton = ({ width = '100%', height = 16, radius: cornerRadius = radius.sm, style }: SkeletonProps) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.9, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: cornerRadius },
        animatedStyle,
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.elevated,
  },
});
