import { WeightUnit } from '../services/calculations';

const KG_PER_LB = 0.45359237;

/** All weights are stored in kg — this only converts for display/input in the user's chosen unit. */
export const kgToUnit = (kg: number, unit: WeightUnit): number =>
  unit === 'lbs' ? Math.round((kg / KG_PER_LB) * 100) / 100 : kg;

export const unitToKg = (value: number, unit: WeightUnit): number =>
  unit === 'lbs' ? value * KG_PER_LB : value;

export const formatWeight = (kg: number, unit: WeightUnit): string => `${kgToUnit(kg, unit)}${unit}`;

export type DistanceUnit = 'km' | 'mi';

const KM_PER_MILE = 1.609344;

/** All distances are stored in km — this only converts for display/input in the user's chosen unit. */
export const kmToUnit = (km: number, unit: DistanceUnit): number =>
  unit === 'mi' ? Math.round((km / KM_PER_MILE) * 100) / 100 : km;

export const unitToKm = (value: number, unit: DistanceUnit): number =>
  unit === 'mi' ? value * KM_PER_MILE : value;

export const formatDistance = (km: number, unit: DistanceUnit): string => `${kmToUnit(km, unit)}${unit}`;

/** Pace is stored as minutes per km — converts to minutes per mile for display when needed. */
export const paceToUnit = (minPerKm: number, unit: DistanceUnit): number =>
  unit === 'mi' ? minPerKm * KM_PER_MILE : minPerKm;
