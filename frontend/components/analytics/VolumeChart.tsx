import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface VolumeChartProps {
  data: { label: string; volume: number }[];
  unit?: string;
  // This component gets reused for genuinely different data (weekly workout
  // volume, muscle-group distribution, body-weight trend) — the accessible
  // summary needs to say which, so it's driven by the same heading text
  // each call site already shows visually rather than a hardcoded guess.
  title?: string;
}

/** Simple native bar chart — avoids web-only charting libs inside React Native. */
export const VolumeChart = ({ data, unit = 'kg', title = 'Gráfico de barras' }: VolumeChartProps) => {
  const volumes = data.map((d) => d.volume);
  const max = Math.max(...volumes, 1);
  const min = data.length > 0 ? Math.min(...volumes) : 0;
  const first = data[0]?.volume ?? 0;
  const last = data[data.length - 1]?.volume ?? 0;
  const trend = last > first ? 'ascendente' : last < first ? 'descendente' : 'estable';
  const chartLabel =
    data.length > 0
      ? `${title}: ${data.length} elemento${data.length === 1 ? '' : 's'}, de ${first}${unit} a ${last}${unit}, mínimo ${min}${unit}, máximo ${max}${unit}, tendencia ${trend}`
      : `${title}: sin datos`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={chartLabel}>
      <View style={styles.container} accessible={false} importantForAccessibility="no-hide-descendants">
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
