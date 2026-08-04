import { estimate1RM, calculateVolume } from './calculations';

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
