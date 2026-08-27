import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  durationMs?: number;
  tone?: 'default' | 'success' | 'error';
}

const toneColor: Record<NonNullable<ToastProps['tone']>, string> = {
  default: colors.accent.fire,
  success: colors.semantic.success,
  error: colors.semantic.error,
};

export const Toast = ({ message, visible, onHide, durationMs = 2000, tone = 'default' }: ToastProps) => {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onHide]);

  if (!visible) return null;

  return (
    <View
      style={[styles.container, { borderColor: toneColor[tone] }]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  text: {
    color: colors.text.primary,
    textAlign: 'center',
  },
});
