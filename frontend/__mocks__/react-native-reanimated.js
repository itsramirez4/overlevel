// react-native-reanimated's own bundled `mock.js` still pulls in the real
// `react-native-worklets` native init at import time under Jest 4.5.x,
// which crashes ("Cannot read properties of undefined (reading
// 'loadUnpackers')") in the test environment. This hand-rolled mock covers
// only the API surface this app actually uses (Button/Card/ProgressBar/
// RoutineCard/WorkoutRow's press-scale, fade-in, and progress-fill
// animations) and skips animation entirely — values apply synchronously.
const { View } = require('react-native');

const useSharedValue = (initial) => ({ value: initial });
const useAnimatedStyle = (factory) => factory();
const withTiming = (toValue) => toValue;
const withSpring = (toValue) => toValue;

// entering/exiting animation builders (FadeIn, FadeInDown, ...) — chainable
// no-ops so `.duration(ms).delay(ms)` calls used in the app don't throw.
const makeAnimationBuilder = () => {
  const builder = {
    duration: () => builder,
    delay: () => builder,
    springify: () => builder,
  };
  return builder;
};

module.exports = {
  __esModule: true,
  default: {
    View,
    createAnimatedComponent: (Component) => Component,
  },
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn: makeAnimationBuilder(),
  FadeInDown: makeAnimationBuilder(),
};
