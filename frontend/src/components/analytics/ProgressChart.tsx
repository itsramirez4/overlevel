import { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, radius, shadow, spacing, typography } from '../../utils/theme';

interface ProgressChartProps {
  points: { date: string; value: number }[];
  unit?: string;
}

const CHART_HEIGHT = 140;
const PADDING_X = 6;
const PADDING_Y = 12;
const TOOLTIP_WIDTH = 100;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

/** SVG line chart for a value trend over time — one point per session. Tap or drag to inspect a point. */
export const ProgressChart = ({ points, unit = 'kg' }: ProgressChartProps) => {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
    value: p.value,
  }));

  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const handleTouch = (x: number) => {
    const current = coordsRef.current;
    if (current.length === 0) return;
    let nearest = 0;
    let nearestDist = Infinity;
    current.forEach((c, i) => {
      const d = Math.abs(c.x - x);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderRelease: () => setActiveIndex(null),
      onPanResponderTerminate: () => setActiveIndex(null),
    })
  ).current;

  const labelIndices =
    points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const first = values[0];
  const last = values[values.length - 1];
  const trend = last > first ? 'ascendente' : last < first ? 'descendente' : 'estable';
  const chartLabel = `Progreso de ${points.length} sesión${points.length === 1 ? '' : 'es'}, de ${first}${unit} a ${last}${unit}, mínimo ${min}${unit}, máximo ${max}${unit}, tendencia ${trend}. Mantén pulsado para ver el detalle de cada sesión.`;

  const active = activeIndex !== null ? coords[activeIndex] : null;
  const tooltipLeft = active ? Math.min(Math.max(active.x - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0)) : 0;

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
        testID="progress-chart-box"
        style={styles.chartBox}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        {...panResponder.panHandlers}
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
            {active && (
              <Line
                x1={active.x}
                y1={PADDING_Y}
                x2={active.x}
                y2={PADDING_Y + innerHeight}
                stroke={colors.border.default}
                strokeWidth={1}
              />
            )}
            {coords.length > 1 && (
              <Polyline
                points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="none"
                stroke={colors.accent.fire}
                strokeWidth={2}
              />
            )}
            {coords.map((c, i) => {
              const isActive = activeIndex === i;
              const isLast = activeIndex === null && i === coords.length - 1;
              return (
                <Circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? 5 : isLast ? 4 : 3}
                  fill={isActive || isLast ? colors.accent.fire : colors.bg.primary}
                  stroke={colors.accent.fire}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        )}
        {active && (
          <View style={[styles.tooltip, { left: tooltipLeft }]} testID="chart-tooltip">
            <Text style={styles.tooltipDate}>{formatDate(active.date)}</Text>
            <Text style={styles.tooltipValue}>
              {active.value}
              {unit}
            </Text>
          </View>
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
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadow.card,
  },
  tooltipDate: {
    ...typography.tiny,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  tooltipValue: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '700',
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
