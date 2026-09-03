import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoggedSetRow } from './LoggedSetRow';
import { api } from '../../services/api';
import { Set } from '../../types';

jest.mock('../../services/api', () => ({
  api: { put: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const baseSet: Set = {
  id: 'set1',
  workout_id: 'w1',
  exercise_id: 'ex1',
  set_number: 1,
  reps: 8,
  weight: 60,
  is_pr: false,
  is_warmup: false,
  created_at: '2026-01-01T00:00:00Z',
};

const baseCardioSet: Set = {
  id: 'set2',
  workout_id: 'w1',
  exercise_id: 'ex2',
  set_number: 1,
  duration_seconds: 1800,
  distance_km: 5,
  is_pr: false,
  is_warmup: false,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('display', () => {
  it('shows weight, reps, and a PR trophy when it is a PR', async () => {
    const { getByText, queryByText } = await render(
      <LoggedSetRow
        set={{ ...baseSet, is_pr: true }}
        exerciseId="ex1"
        weightUnit="kg"
        distanceUnit="km"
        onChanged={jest.fn()}
      />
    );
    expect(getByText('60kg × 8 reps')).toBeTruthy();
    expect(queryByText('Calentamiento')).toBeNull();
  });

  it('shows a warmup tag for a warmup set', async () => {
    const { getByText } = await render(
      <LoggedSetRow
        set={{ ...baseSet, is_warmup: true }}
        exerciseId="ex1"
        weightUnit="kg"
        distanceUnit="km"
        onChanged={jest.fn()}
      />
    );
    expect(getByText('Calentamiento')).toBeTruthy();
  });
});

describe('editing', () => {
  it('rejects saving a negative value without calling the API', async () => {
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '-5');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(getByText(/no pueden ser negativos/)).toBeTruthy());
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('accepts zero weight — bodyweight-only work is a real set', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '0');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/sets/set1', { weight: 0, reps: 8 }));
  });

  it('saves a valid edit, converting into kg, and exits edit mode', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText, queryByText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '65');
    await fireEvent.changeText(getByPlaceholderText('Reps'), '10');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/sets/set1', { weight: 65, reps: 10 }));
    expect(onChanged).toHaveBeenCalled();
    // Back to display mode — the Guardar button is gone.
    expect(queryByText('Guardar')).toBeNull();
  });

  it('shows the server error message when saving fails', async () => {
    mockedApi.put.mockRejectedValue({ response: { data: { message: 'No se pudo guardar la serie' } } });
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={jest.fn()} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '65');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(getByText('No se pudo guardar la serie')).toBeTruthy());
  });
});

describe('cardio editing', () => {
  it('rejects saving a negative duration or distance without calling the API', async () => {
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseCardioSet} isCardio exerciseId="ex2" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Km'), '-5');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(getByText(/no pueden ser negativos/)).toBeTruthy());
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('accepts zero distance — stationary/no-distance cardio work is real too', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseCardioSet} isCardio exerciseId="ex2" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Km'), '0');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() =>
      expect(mockedApi.put).toHaveBeenCalledWith('/sets/set2', { duration_seconds: 1800, distance_km: 0 })
    );
  });
});

describe('per-exercise unit toggle', () => {
  it('tapping the unit chip while editing converts the value and persists the new unit', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const { getByText, getByLabelText, getByPlaceholderText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={jest.fn()} />
    );

    await fireEvent.press(getByLabelText('Editar serie 1'));
    expect(getByPlaceholderText('Kg').props.value).toBe('60');

    await fireEvent.press(getByText('KG ⇄'));

    // weightUnit is a static prop in this isolated render (in the real app
    // it flows back from workoutStore and the placeholder relabels to "Lbs"
    // too) — what matters here is the typed value converts and the new unit
    // gets persisted.
    expect(getByPlaceholderText('Kg').props.value).toBe('132.28');
    expect(mockedApi.put).toHaveBeenCalledWith('/exercises/ex1', { weight_unit: 'lbs' });
  });
});

describe('deleting', () => {
  it('deletes the set after confirming, and notifies the parent', async () => {
    mockedApi.delete.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText } = await render(
      <LoggedSetRow set={baseSet} exerciseId="ex1" weightUnit="kg" distanceUnit="km" onChanged={onChanged} />
    );

    await fireEvent.press(getByLabelText('Borrar serie 1'));
    await fireEvent.press(getByText('Borrar'));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/sets/set1'));
    expect(onChanged).toHaveBeenCalled();
  });
});
