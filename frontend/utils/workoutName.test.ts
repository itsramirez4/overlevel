import { getWorkoutName } from './workoutName';
import { Workout } from '../types';

const base: Workout = {
  id: 'w1',
  user_id: 'u1',
  started_at: '2026-03-05T10:00:00Z',
  created_at: '2026-03-05T10:00:00Z',
};

describe('getWorkoutName', () => {
  it('prefers an explicit title', () => {
    expect(getWorkoutName({ ...base, title: 'Leg Day', routines: { name: 'Push Pull Legs' } })).toBe('Leg Day');
  });

  it('falls back to the routine name when there is no title', () => {
    expect(getWorkoutName({ ...base, routines: { name: 'Push Pull Legs' } })).toBe('Push Pull Legs');
  });

  it('falls back to a formatted date when neither title nor routine exist', () => {
    const name = getWorkoutName(base);
    expect(name).not.toBe('');
    expect(name.toLowerCase()).toContain('marzo');
  });
});
