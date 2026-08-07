import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoggedSetRow } from './LoggedSetRow';
import { api } from '../../services/api';
import { authStore } from '../../stores/authStore';
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

beforeEach(() => {
  jest.clearAllMocks();
  authStore.setState({ user: { weight_unit: 'kg' } as any });
});

describe('display', () => {
  it('shows weight, reps, and a PR trophy when it is a PR', async () => {
    const { getByText, queryByText } = await render(
      <LoggedSetRow set={{ ...baseSet, is_pr: true }} onChanged={jest.fn()} />
    );
    expect(getByText('60kg × 8 reps')).toBeTruthy();
    expect(queryByText('Calentamiento')).toBeNull();
  });

  it('shows a warmup tag for a warmup set', async () => {
    const { getByText } = await render(<LoggedSetRow set={{ ...baseSet, is_warmup: true }} onChanged={jest.fn()} />);
    expect(getByText('Calentamiento')).toBeTruthy();
  });
});

describe('editing', () => {
  it('rejects saving zero/negative values without calling the API', async () => {
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText } = await render(<LoggedSetRow set={baseSet} onChanged={onChanged} />);

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '0');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(getByText(/mayores que cero/)).toBeTruthy());
    expect(mockedApi.put).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('saves a valid edit, converting into kg, and exits edit mode', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText, getByPlaceholderText, queryByText } = await render(
      <LoggedSetRow set={baseSet} onChanged={onChanged} />
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
    const { getByText, getByLabelText, getByPlaceholderText } = await render(<LoggedSetRow set={baseSet} onChanged={jest.fn()} />);

    await fireEvent.press(getByLabelText('Editar serie 1'));
    await fireEvent.changeText(getByPlaceholderText('Kg'), '65');
    await fireEvent.press(getByText('Guardar'));

    await waitFor(() => expect(getByText('No se pudo guardar la serie')).toBeTruthy());
  });
});

describe('deleting', () => {
  it('deletes the set after confirming, and notifies the parent', async () => {
    mockedApi.delete.mockResolvedValue({ data: {} });
    const onChanged = jest.fn();
    const { getByText, getByLabelText } = await render(<LoggedSetRow set={baseSet} onChanged={onChanged} />);

    await fireEvent.press(getByLabelText('Borrar serie 1'));
    await fireEvent.press(getByText('Borrar'));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/sets/set1'));
    expect(onChanged).toHaveBeenCalled();
  });
});
