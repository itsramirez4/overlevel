import { estimate1RM, calculateVolume, calculatePlates } from './calculations';

describe('estimate1RM', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('applies the Epley formula for multiple reps', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 1);
  });
});

describe('calculateVolume', () => {
  it('multiplies weight by reps', () => {
    expect(calculateVolume(100, 5)).toBe(500);
  });
});

describe('calculatePlates', () => {
  it('splits the per-side weight into the largest plates first', () => {
    const result = calculatePlates(100, 20, 'kg');
    expect(result.perSideWeight).toBe(40);
    expect(result.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(result.achievedTotal).toBe(100);
    expect(result.remainder).toBe(0);
  });

  it('combines multiple plate sizes when needed', () => {
    const result = calculatePlates(140, 20, 'kg');
    expect(result.perSideWeight).toBe(60);
    expect(result.perSide).toEqual([
      { plate: 25, count: 2 },
      { plate: 10, count: 1 },
    ]);
    expect(result.achievedTotal).toBe(140);
  });

  it('reports a remainder when the target is not exactly reachable', () => {
    const result = calculatePlates(101, 20, 'kg');
    expect(result.achievedTotal).toBe(100);
    expect(result.remainder).toBe(1);
  });

  it('never returns a negative per-side weight when the target is below bar weight', () => {
    const result = calculatePlates(10, 20, 'kg');
    expect(result.perSideWeight).toBe(0);
    expect(result.perSide).toEqual([]);
  });
});
