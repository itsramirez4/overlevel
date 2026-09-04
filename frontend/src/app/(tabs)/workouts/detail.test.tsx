import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkoutDetailScreen from './detail';
import { api } from '../../../services/api';
import { authStore } from '../../../stores/authStore';
import { Workout } from '../../../types';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'w1' }),
}));

jest.mock('../../../services/api', () => ({
  api: { get: jest.fn(), delete: jest.fn(), put: jest.fn(), post: jest.fn() },
}));

jest.mock('../../../hooks/useOfflineSync', () => ({
  enqueueOfflineMutation: jest.fn().mockResolvedValue(undefined),
}));

const mockedApi = api as jest.Mocked<typeof api>;

const baseWorkout: Workout = {
  id: 'w1',
  user_id: 'u1',
  started_at: '2026-01-15T10:00:00Z',
  completed_at: '2026-01-15T11:00:00Z',
  created_at: '2026-01-15T10:00:00Z',
  title: 'Push Day',
  sets: [
    {
      id: 's1',
      workout_id: 'w1',
      exercise_id: 'ex1',
      set_number: 1,
      weight: 60,
      reps: 8,
      is_pr: false,
      is_warmup: false,
      created_at: '2026-01-15T10:00:00Z',
      exercises: {
        id: 'ex1',
        user_id: 'u1',
        name: 'Press banca',
        category: 'compound',
        muscle_groups: [],
        equipment: [],
        is_custom: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    },
    {
      id: 's2',
      workout_id: 'w1',
      exercise_id: 'ex2',
      set_number: 1,
      weight: 40,
      reps: 10,
      is_pr: true,
      is_warmup: false,
      created_at: '2026-01-15T10:05:00Z',
      exercises: {
        id: 'ex2',
        user_id: 'u1',
        name: 'Remo',
        category: 'compound',
        muscle_groups: [],
        equipment: [],
        is_custom: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    },
  ],
};

const renderScreen = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutDetailScreen />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  authStore.setState({ user: { id: 'u1', email: 'a@b.com', username: 'me', weight_unit: 'kg', distance_unit: 'km', profile_public: true, created_at: '', updated_at: '' } });
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/workouts/w1') return Promise.resolve({ data: baseWorkout });
    if (url.startsWith('/workout-exercise-notes')) return Promise.resolve({ data: [] });
    if (url.startsWith('/exercises')) return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
});

describe('WorkoutDetailScreen', () => {
  it('shows stats and sets grouped by exercise, with a PR trophy on the PR set', async () => {
    const { findByText, getByText } = await renderScreen();

    await findByText('Press banca');
    expect(getByText('Remo')).toBeTruthy();
    expect(getByText('2')).toBeTruthy(); // Series stat
    expect(getByText('60kg × 8 reps')).toBeTruthy();
    expect(getByText('40kg × 10 reps')).toBeTruthy();
  });

  it('deletes the workout after confirming, then navigates back', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined });
    const { findByText, getByLabelText, getByText } = await renderScreen();
    await findByText('Press banca');

    await fireEvent.press(getByLabelText('Borrar entrenamiento'));
    await fireEvent.press(getByText('Borrar'));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/workouts/w1'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('shows an alert and leaves the screen in place when deleting fails', async () => {
    mockedApi.delete.mockRejectedValue(new Error('boom'));
    const { findByText, getByLabelText, getByText } = await renderScreen();
    await findByText('Press banca');

    await fireEvent.press(getByLabelText('Borrar entrenamiento'));
    await fireEvent.press(getByText('Borrar'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringContaining('No se pudo borrar'))
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('entering edit mode reveals a remove control per exercise, and removing one deletes its sets', async () => {
    mockedApi.delete.mockResolvedValue({ data: undefined });
    const { findByText, getByLabelText, getByText } = await renderScreen();
    await findByText('Press banca');

    await fireEvent.press(getByLabelText('Editar series'));
    await fireEvent.press(getByLabelText('Quitar Press banca del entrenamiento'));
    await fireEvent.press(getByText('Quitar'));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/sets/s1'));
    expect(mockedApi.delete).not.toHaveBeenCalledWith('/sets/s2');
  });
});
