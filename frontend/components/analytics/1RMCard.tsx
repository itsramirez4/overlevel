import { StatCard } from './StatCard';

interface OneRepMaxCardProps {
  estimated1RM: number;
  unit?: 'kg' | 'lbs';
  /** Exercise name, used to build a specific accessibility label, e.g. "1RM estimado de Sentadilla: 120kg". */
  exerciseName?: string;
}

export const OneRepMaxCard = ({ estimated1RM, unit = 'kg', exerciseName }: OneRepMaxCardProps) => (
  <StatCard
    label="Estimated 1RM"
    value={`${estimated1RM}${unit}`}
    accessibilityLabel={
      exerciseName ? `1RM estimado de ${exerciseName}: ${estimated1RM}${unit}` : `1RM estimado: ${estimated1RM}${unit}`
    }
  />
);
