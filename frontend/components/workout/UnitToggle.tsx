import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../utils/theme';

interface UnitToggleProps {
  label: string;
  onPress: () => void;
}

/** A small tappable unit label (e.g. "KG ⇄") shown above a numeric input —
 * tapping cycles that field's unit for this specific exercise. */
export const UnitToggle = ({ label, onPress }: UnitToggleProps) => (
  <TouchableOpacity onPress={onPress} style={styles.chip} activeOpacity={0.7} hitSlop={6}>
    <Text style={styles.text}>{label.toUpperCase()} ⇄</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  text: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '700',
  },
});
