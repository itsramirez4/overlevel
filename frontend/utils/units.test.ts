import { kgToUnit, unitToKg, formatWeight } from './units';

describe('kgToUnit', () => {
  it('returns the value unchanged for kg', () => {
    expect(kgToUnit(100, 'kg')).toBe(100);
  });

  it('converts kg to lbs', () => {
    expect(kgToUnit(100, 'lbs')).toBeCloseTo(220.46, 1);
  });

  it('rounds to 2 decimal places', () => {
    expect(kgToUnit(1, 'lbs')).toBe(2.2);
  });
});

describe('unitToKg', () => {
  it('returns the value unchanged for kg', () => {
    expect(unitToKg(100, 'kg')).toBe(100);
  });

  it('converts lbs to kg', () => {
    expect(unitToKg(220.46, 'lbs')).toBeCloseTo(100, 1);
  });
});

describe('kg/lbs round-trip', () => {
  it('does not drift meaningfully across repeated conversions', () => {
    let kg = 100;
    for (let i = 0; i < 20; i++) {
      kg = unitToKg(kgToUnit(kg, 'lbs'), 'lbs');
    }
    expect(kg).toBeCloseTo(100, 0);
  });
});

describe('formatWeight', () => {
  it('appends the unit suffix', () => {
    expect(formatWeight(100, 'kg')).toBe('100kg');
    expect(formatWeight(100, 'lbs')).toBe('220.46lbs');
  });
});
