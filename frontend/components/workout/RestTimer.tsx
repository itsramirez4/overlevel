import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';
import { workoutStore } from '../../stores/workoutStore';

export const RestTimer = () => {
  const restEndsAt = workoutStore((state) => state.restEndsAt);
  const clearRest = workoutStore((state) => state.clearRest);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!restEndsAt) return;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((restEndsAt - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft === 0) clearRest();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [restEndsAt, clearRest]);

  if (!restEndsAt) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DESCANSO</Text>
      <Text style={styles.time}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>
      <TouchableOpacity onPress={clearRest} hitSlop={10} accessibilityLabel="Saltar descanso">
        <X size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.accent.fire,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadow.glow,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  time: {
    ...typography.h2,
    color: colors.accent.fire,
    flex: 1,
  },
});
