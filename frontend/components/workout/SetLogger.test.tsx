import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SetLogger } from './SetLogger';
import { api } from '../../services/api';
import { workoutStore } from '../../stores/workoutStore';
import { authStore } from '../../stores/authStore';
import { scheduleRestTimerNotification } from '../../services/notifications';

jest.mock('../../services/api', () => ({
  api: { post: jest.fn() },
}));
jest.mock('../../services/notifications', () => ({
  scheduleRestTimerNotification: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const exercise = { id: 'ex1', name: 'Bench Press' };

beforeEach(() => {
  jest.clearAllMocks();
  workoutStore.setState({ restEndsAt: null });
  authStore.setState({ user: { weight_unit: 'kg' } as any });
});

describe('SetLogger validation', () => {
  it('rejects an empty submission without calling the API', async () => {
    const onSetLogged = jest.fn();
    const { getByText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={onSetLogged} />
    );

    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(getByText(/mayores que cero/)).toBeTruthy());
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(onSetLogged).not.toHaveBeenCalled();
  });

  it('rejects zero and negative values', async () => {
    const onSetLogged = jest.fn();
    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={onSetLogged} />
    );

    await fireEvent.changeText(getByPlaceholderText('Kg'), '0');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '-5');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(getByText(/mayores que cero/)).toBeTruthy());
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});

describe('SetLogger submission', () => {
  it('logs a valid set, converting weight into kg for storage', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 's1' } });
    authStore.setState({ user: { weight_unit: 'lbs' } as any });
    const onSetLogged = jest.fn();

    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={2} onSetLogged={onSetLogged} />
    );

    await fireEvent.changeText(getByPlaceholderText('Lbs'), '220');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '8');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());

    const [, payload] = mockedApi.post.mock.calls[0];
    expect(payload).toMatchObject({ workout_id: 'w1', exercise_id: 'ex1', set_number: 2, reps: 8, is_warmup: false });
    expect((payload as any).weight).toBeCloseTo(99.79, 1); // 220 lbs -> kg
    expect(onSetLogged).toHaveBeenCalled();
  });

  it('marks the set as a warmup when the chip is toggled', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 's2' } });
    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={jest.fn()} />
    );

    await fireEvent.press(getByText('Marcar como calentamiento'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '20');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '12');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
    const [, payload] = mockedApi.post.mock.calls[0];
    expect((payload as any).is_warmup).toBe(true);
  });

  it('starts the rest timer and schedules its notification after a successful log', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 's3' } });
    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={jest.fn()} shouldRest />
    );

    await fireEvent.changeText(getByPlaceholderText('Kg'), '50');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '5');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
    expect(workoutStore.getState().restEndsAt).not.toBeNull();
    expect(scheduleRestTimerNotification).toHaveBeenCalledWith(90); // default rest value
  });

  it('does not start the rest timer when shouldRest is false (inside a superset)', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 's4' } });
    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={jest.fn()} shouldRest={false} />
    );

    await fireEvent.changeText(getByPlaceholderText('Kg'), '50');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '5');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
    expect(workoutStore.getState().restEndsAt).toBeNull();
    expect(scheduleRestTimerNotification).not.toHaveBeenCalled();
  });

  it('shows the server error message when the API call fails', async () => {
    mockedApi.post.mockRejectedValue({ response: { data: { message: 'Entrenamiento ya finalizado' } } });
    const { getByText, getByPlaceholderText } = await render(
      <SetLogger workoutId="w1" exercise={exercise} setNumber={1} onSetLogged={jest.fn()} />
    );

    await fireEvent.changeText(getByPlaceholderText('Kg'), '50');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '5');
    await fireEvent.press(getByText('REGISTRAR SERIE'));

    await waitFor(() => expect(getByText('Entrenamiento ya finalizado')).toBeTruthy());
  });
});
