import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, spacing, typography } from '../../utils/theme';

interface ProgressChartProps {
  points: { date: string; value: number }[];
  unit?: string;
}

const CHART_HEIGHT = 140;
const PADDING_X = 6;
const PADDING_Y = 12;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

/** SVG line chart for a value trend over time — one point per session. */
export const ProgressChart = ({ points, unit = 'kg' }: ProgressChartProps) => {
  const [width, setWidth] = useState(0);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const innerWidth = Math.max(width - PADDING_X * 2, 0);
  const innerHeight = CHART_HEIGHT - PADDING_Y * 2;

  const coords = points.map((p, i) => ({
    x: PADDING_X + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth),
    y: PADDING_Y + innerHeight - ((p.value - min) / range) * innerHeight,
    date: p.date,
  }));

  const labelIndices =
    points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const first = values[0];
  const last = values[values.length - 1];
  const trend = last > first ? 'ascendente' : last < first ? 'descendente' : 'estable';
  const chartLabel = `Progreso de ${points.length} sesión${points.length === 1 ? '' : 'es'}, de ${first}${unit} a ${last}${unit}, mínimo ${min}${unit}, máximo ${max}${unit}, tendencia ${trend}`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={chartLabel}>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>
          {points.length} sesión{points.length === 1 ? '' : 'es'}
        </Text>
        <Text style={styles.rangeLabel}>
          {min}
          {unit} – {max}
          {unit}
        </Text>
      </View>
      <View
        style={styles.chartBox}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Line
              x1={0}
              y1={PADDING_Y + innerHeight}
              x2={width}
              y2={PADDING_Y + innerHeight}
              stroke={colors.border.subtle}
              strokeWidth={1}
            />
            {coords.length > 1 && (
              <Polyline
                points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="none"
                stroke={colors.accent.fire}
                strokeWidth={2}
              />
            )}
            {coords.map((c, i) => (
              <Circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 4 : 3}
                fill={i === coords.length - 1 ? colors.accent.fire : colors.bg.primary}
                stroke={colors.accent.fire}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.labelsRow}>
        {labelIndices.map((i) => (
          <Text key={i} style={styles.axisLabel}>
            {formatDate(points[i].date)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rangeLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  chartBox: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  axisLabel: {
    ...typography.tiny,
    color: colors.text.muted,
  },
});
