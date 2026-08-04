import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface VolumeChartProps {
  data: { label: string; volume: number }[];
  unit?: string;
}

/** Simple native bar chart — avoids web-only charting libs inside React Native. */
export const VolumeChart = ({ data, unit = 'kg' }: VolumeChartProps) => {
  const max = Math.max(...data.map((d) => d.volume), 1);

  return (
    <View style={styles.container}>
      {data.map((d, index) => (
        <View key={`${d.label}-${index}`} style={styles.row}>
          <Text style={styles.label}>{d.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { width: `${(d.volume / max) * 100}%` }]} />
          </View>
          <Text style={styles.value}>{d.volume}{unit}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.text.secondary,
    width: 60,
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.accent.fire,
  },
  value: {
    color: colors.text.primary,
    width: 60,
    fontSize: 12,
    textAlign: 'right',
  },
});
