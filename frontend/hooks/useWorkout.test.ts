import { renderHook, act } from '@testing-library/react-native';
import { useWorkout } from './useWorkout';
import { workoutStore } from '../stores/workoutStore';
import { api } from '../services/api';
import { requestNotificationPermissions } from '../services/notifications';

jest.mock('../services/api', () => ({
  api: { post: jest.fn(), get: jest.fn(), put: jest.fn() },
}));
jest.mock('../services/notifications', () => ({
  requestNotificationPermissions: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  workoutStore.setState({
    currentWorkout: null,
    sessionExercises: [],
    restEndsAt: null,
    linkedToPrevious: {},
  });
});

describe('startWorkout', () => {
  it('starts a freestyle workout (no routine) and clears session exercises', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'w1', started_at: '2026-01-01T00:00:00Z' } });
    const { result } = await renderHook(() => useWorkout());

    await act(async () => result.current.startWorkout());

    expect(mockedApi.post).toHaveBeenCalledWith('/workouts', { routine_id: undefined });
    expect(workoutStore.getState().currentWorkout?.id).toBe('w1');
    expect(workoutStore.getState().sessionExercises).toEqual([]);
    expect(requestNotificationPermissions).toHaveBeenCalled();
  });

  it('starting a routine-based workout loads and orders its exercises, carrying target fields', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'w2', started_at: '2026-01-01T00:00:00Z' } });
    mockedApi.get.mockResolvedValue({
      data: {
        routine_exercises: [
          { order_num: 2, target_sets: 3, target_weight: 40, target_reps: 10, exercises: { id: 'b', name: 'Second' } },
          { order_num: 1, target_sets: 4, target_weight: 60, target_reps: 8, exercises: { id: 'a', name: 'First' } },
          // No `exercises` embed (e.g. the exercise was deleted) — must be filtered out, not crash.
          { order_num: 3, exercises: null },
        ],
      },
    });

    const { result } = await renderHook(() => useWorkout());
    await act(async () => result.current.startWorkout('r1'));

    expect(mockedApi.get).toHaveBeenCalledWith('/routines/r1');
    const exercises = workoutStore.getState().sessionExercises;
    expect(exercises.map((e: any) => e.id)).toEqual(['a', 'b']);
    expect((exercises[0] as any).target_weight).toBe(60);
  });
});

describe('completeWorkout', () => {
  it('is a no-op when there is no current workout', async () => {
    const { result } = await renderHook(() => useWorkout());

    const returned = await act(async () => result.current.completeWorkout());

    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(returned).toBeUndefined();
  });

  it('completes the current workout and clears session state', async () => {
    workoutStore.getState().setCurrentWorkout({ id: 'w3', user_id: 'u1', started_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' });
    workoutStore.getState().setSessionExercises([
      { id: 'a', user_id: 'u1', name: 'A', category: 'compound', muscle_groups: [], equipment: [], is_custom: true, created_at: '2026-01-01T00:00:00Z' },
    ]);
    mockedApi.put.mockResolvedValue({ data: { id: 'w3', completed_at: '2026-01-01T01:00:00Z' } });

    const { result } = await renderHook(() => useWorkout());
    const returned = await act(async () => result.current.completeWorkout('Leg Day', 'good', 'felt great'));

    expect(mockedApi.put).toHaveBeenCalledWith('/workouts/w3/complete', {
      title: 'Leg Day',
      felt_like: 'good',
      notes: 'felt great',
    });
    expect(workoutStore.getState().currentWorkout).toBeNull();
    expect(workoutStore.getState().sessionExercises).toEqual([]);
    expect(returned).toEqual({ id: 'w3', completed_at: '2026-01-01T01:00:00Z' });
  });
});
