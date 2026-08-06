import { WeightUnit } from '../services/calculations';

const KG_PER_LB = 0.45359237;

/** All weights are stored in kg — this only converts for display/input in the user's chosen unit. */
export const kgToUnit = (kg: number, unit: WeightUnit): number =>
  unit === 'lbs' ? Math.round((kg / KG_PER_LB) * 100) / 100 : kg;

export const unitToKg = (value: number, unit: WeightUnit): number =>
  unit === 'lbs' ? value * KG_PER_LB : value;

export const formatWeight = (kg: number, unit: WeightUnit): string => `${kgToUnit(kg, unit)}${unit}`;
