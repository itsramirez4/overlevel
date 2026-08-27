import { kgToUnit, unitToKg, formatWeight, kmToUnit, unitToKm, formatDistance, paceToUnit } from './units';

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

describe('kmToUnit', () => {
  it('returns the value unchanged for km', () => {
    expect(kmToUnit(10, 'km')).toBe(10);
  });

  it('converts km to miles', () => {
    expect(kmToUnit(10, 'mi')).toBeCloseTo(6.21, 1);
  });
});

describe('unitToKm', () => {
  it('returns the value unchanged for km', () => {
    expect(unitToKm(10, 'km')).toBe(10);
  });

  it('converts miles to km', () => {
    expect(unitToKm(6.21, 'mi')).toBeCloseTo(10, 1);
  });
});

describe('formatDistance', () => {
  it('appends the unit suffix', () => {
    expect(formatDistance(10, 'km')).toBe('10km');
    expect(formatDistance(10, 'mi')).toBe('6.21mi');
  });
});

describe('paceToUnit', () => {
  it('returns the value unchanged for km', () => {
    expect(paceToUnit(5, 'km')).toBe(5);
  });

  it('converts a min/km pace to min/mile', () => {
    // A 5:00/km pace is slower per mile (a mile is longer than a km).
    expect(paceToUnit(5, 'mi')).toBeCloseTo(8.05, 1);
  });
});
