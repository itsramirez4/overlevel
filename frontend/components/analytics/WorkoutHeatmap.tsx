import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../utils/theme';

interface WorkoutHeatmapProps {
  data: { date: string; volume: number }[];
}

const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const levelColor = (volume: number, max: number) => {
  if (volume <= 0) return colors.bg.tertiary;
  if (max <= 0) return colors.bg.tertiary;
  const ratio = volume / max;
  if (ratio > 0.75) return colors.accent.fire;
  if (ratio > 0.5) return `${colors.accent.fire}b3`;
  if (ratio > 0.25) return `${colors.accent.fire}66`;
  return `${colors.accent.fire}33`;
};

/** GitHub-style activity grid: one row per Monday-aligned week, 7 day-columns each. */
export const WorkoutHeatmap = ({ data }: WorkoutHeatmapProps) => {
  const max = Math.max(...data.map((d) => d.volume), 1);
  const weeks: { date: string; volume: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  const todayKey = new Date().toISOString().split('T')[0];

  return (
    <View>
      <View style={styles.dayLabelsRow}>
        {dayLabels.map((label) => (
          <Text key={label} style={styles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((day) => (
            <View
              key={day.date}
              style={[
                styles.cell,
                { backgroundColor: levelColor(day.volume, max) },
                day.date === todayKey && styles.cellToday,
                day.date > todayKey && styles.cellFuture,
              ]}
            />
          ))}
        </View>
      ))}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Menos</Text>
        {[0, 0.2, 0.4, 0.6, 1].map((r) => (
          <View key={r} style={[styles.legendCell, { backgroundColor: levelColor(r, 1) }]} />
        ))}
        <Text style={styles.legendLabel}>Más</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayLabelsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    fontSize: 10,
    color: colors.text.muted,
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm / 2,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.text.primary,
  },
  cellFuture: {
    opacity: 0,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.sm,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.text.muted,
    marginHorizontal: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
