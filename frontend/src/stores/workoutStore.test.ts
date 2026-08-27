import { workoutStore } from './workoutStore';
import { Exercise, Workout } from '../types';

const mkExercise = (id: string): Exercise => ({
  id,
  user_id: 'u1',
  name: `Exercise ${id}`,
  category: 'compound',
  muscle_groups: [],
  equipment: [],
  is_custom: true,
  created_at: '2026-01-01T00:00:00Z',
});

const mkWorkout = (id: string): Workout => ({
  id,
  user_id: 'u1',
  started_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
});

// Resets between tests — zustand stores are module-level singletons, so
// state would otherwise leak from one test into the next.
beforeEach(() => {
  workoutStore.setState({
    currentWorkout: null,
    sessionExercises: [],
    restEndsAt: null,
    linkedToPrevious: {},
  });
});

describe('addSessionExercise', () => {
  it('adds a new exercise to the session', () => {
    workoutStore.getState().addSessionExercise(mkExercise('a'));
    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['a']);
  });

  it('does not add the same exercise twice', () => {
    workoutStore.getState().addSessionExercise(mkExercise('a'));
    workoutStore.getState().addSessionExercise(mkExercise('a'));
    expect(workoutStore.getState().sessionExercises).toHaveLength(1);
  });
});

describe('removeSessionExercise', () => {
  it('removes the exercise and its superset link', () => {
    workoutStore.getState().addSessionExercise(mkExercise('a'));
    workoutStore.getState().addSessionExercise(mkExercise('b'));
    workoutStore.getState().toggleSupersetLink('b');

    workoutStore.getState().removeSessionExercise('b');

    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['a']);
    expect(workoutStore.getState().linkedToPrevious).not.toHaveProperty('b');
  });
});

describe('setSessionExercises', () => {
  it('replaces the exercise list and clears superset links', () => {
    workoutStore.getState().toggleSupersetLink('a');
    workoutStore.getState().setSessionExercises([mkExercise('x'), mkExercise('y')]);

    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['x', 'y']);
    expect(workoutStore.getState().linkedToPrevious).toEqual({});
  });
});

describe('moveSessionExercise', () => {
  beforeEach(() => {
    workoutStore.getState().setSessionExercises([mkExercise('a'), mkExercise('b'), mkExercise('c')]);
  });

  it('moves an exercise up, swapping it with its predecessor', () => {
    workoutStore.getState().moveSessionExercise('b', 'up');
    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves an exercise down, swapping it with its successor', () => {
    workoutStore.getState().moveSessionExercise('b', 'down');
    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing when the first exercise is moved up', () => {
    workoutStore.getState().moveSessionExercise('a', 'up');
    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when the last exercise is moved down', () => {
    workoutStore.getState().moveSessionExercise('c', 'down');
    expect(workoutStore.getState().sessionExercises.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('clears superset links on a successful move', () => {
    workoutStore.getState().toggleSupersetLink('b');
    workoutStore.getState().moveSessionExercise('b', 'up');
    expect(workoutStore.getState().linkedToPrevious).toEqual({});
  });
});

describe('toggleSupersetLink', () => {
  it('flips a link on, then off again', () => {
    workoutStore.getState().toggleSupersetLink('a');
    expect(workoutStore.getState().linkedToPrevious.a).toBe(true);

    workoutStore.getState().toggleSupersetLink('a');
    expect(workoutStore.getState().linkedToPrevious.a).toBe(false);
  });
});

describe('rest timer', () => {
  it('startRest sets a future end time, clearRest clears it', () => {
    const before = Date.now();
    workoutStore.getState().startRest(90);
    expect(workoutStore.getState().restEndsAt).toBeGreaterThanOrEqual(before + 90 * 1000);

    workoutStore.getState().clearRest();
    expect(workoutStore.getState().restEndsAt).toBeNull();
  });
});

describe('setCurrentWorkout', () => {
  it('setting a new workout clears any in-progress rest timer', () => {
    workoutStore.getState().startRest(90);
    workoutStore.getState().setCurrentWorkout(mkWorkout('w1'));

    expect(workoutStore.getState().currentWorkout?.id).toBe('w1');
    expect(workoutStore.getState().restEndsAt).toBeNull();
  });
});
