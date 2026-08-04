import { StatCard } from './StatCard';

interface OneRepMaxCardProps {
  estimated1RM: number;
  unit?: 'kg' | 'lbs';
}

export const OneRepMaxCard = ({ estimated1RM, unit = 'kg' }: OneRepMaxCardProps) => (
  <StatCard label="Estimated 1RM" value={`${estimated1RM}${unit}`} />
);
