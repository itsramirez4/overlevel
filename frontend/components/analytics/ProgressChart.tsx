import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface ProgressChartProps {
  points: { date: string; value: number }[];
}

/** Simple native sparkline-style progress indicator. */
export const ProgressChart = ({ points }: ProgressChartProps) => {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <View style={styles.container}>
      {points.map((p) => (
        <View key={p.date} style={styles.column}>
          <View style={[styles.dot, { bottom: `${(p.value / max) * 100}%` }]} />
        </View>
      ))}
      <Text style={styles.caption}>{points.length} sessions</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  column: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.fire,
    alignSelf: 'center',
  },
  caption: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 8,
  },
});
