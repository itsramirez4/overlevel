import { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../../utils/theme';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
}

export const ProgressBar = ({ progress, height = 10, color = colors.accent.gold, style }: ProgressBarProps) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.round(progress * 100), { duration: 400 });
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, animatedStyle]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
