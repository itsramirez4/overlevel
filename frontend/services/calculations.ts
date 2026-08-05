/** Epley formula estimated one-rep max. */
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
};

export const calculateVolume = (weight: number, reps: number): number => weight * reps;

export type WeightUnit = 'kg' | 'lbs';

export interface PlateBreakdown {
  plate: number;
  count: number;
}

export interface PlateCalculation {
  perSide: PlateBreakdown[];
  perSideWeight: number;
  achievedTotal: number;
  /** Positive when the target can't be hit exactly with the available plates. */
  remainder: number;
}

const STANDARD_PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lbs: [45, 35, 25, 10, 5, 2.5],
};

export const defaultBarWeight = (unit: WeightUnit): number => (unit === 'kg' ? 20 : 45);

/** Greedily fills each side of the bar with the largest plates first — the standard loading order. */
export const calculatePlates = (targetWeight: number, barWeight: number, unit: WeightUnit): PlateCalculation => {
  const perSideTarget = Math.max(0, (targetWeight - barWeight) / 2);
  const plates = STANDARD_PLATES[unit];

  let remaining = perSideTarget;
  const perSide: PlateBreakdown[] = [];
  for (const plate of plates) {
    let count = 0;
    while (remaining >= plate - 1e-6) {
      remaining -= plate;
      count++;
    }
    if (count > 0) perSide.push({ plate, count });
  }

  const perSideWeight = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const achievedTotal = barWeight + perSideWeight * 2;

  return {
    perSide,
    perSideWeight,
    achievedTotal,
    remainder: Math.round((targetWeight - achievedTotal) * 100) / 100,
  };
};
