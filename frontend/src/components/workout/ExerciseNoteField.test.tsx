import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ExerciseNoteField } from './ExerciseNoteField';
import { api } from '../../services/api';
import { enqueueOfflineMutation } from '../../hooks/useOfflineSync';

jest.mock('../../services/api', () => ({
  api: { put: jest.fn() },
}));
jest.mock('../../hooks/useOfflineSync', () => ({
  enqueueOfflineMutation: jest.fn().mockResolvedValue(undefined),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedEnqueue = enqueueOfflineMutation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ExerciseNoteField', () => {
  it('shows the existing note text', async () => {
    const { getByPlaceholderText } = await render(
      <ExerciseNoteField workoutId="w1" exerciseId="ex1" value="Fue duro hoy" />
    );
    expect(getByPlaceholderText('¿Cómo fue este ejercicio hoy?').props.value).toBe('Fue duro hoy');
  });

  it('saves the new text on blur when it changed, and notifies the parent', async () => {
    mockedApi.put.mockResolvedValue({ data: {} });
    const onSaved = jest.fn();
    const { getByPlaceholderText } = await render(
      <ExerciseNoteField workoutId="w1" exerciseId="ex1" value="" onSaved={onSaved} />
    );

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Nueva nota');
    await fireEvent(input, 'blur');

    await waitFor(() =>
      expect(mockedApi.put).toHaveBeenCalledWith('/workout-exercise-notes/w1/ex1', { notes: 'Nueva nota' })
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('does not save on blur when the text never changed', async () => {
    const { getByPlaceholderText } = await render(<ExerciseNoteField workoutId="w1" exerciseId="ex1" value="Igual" />);

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent(input, 'blur');

    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('does not re-sync from a value prop change while the user is mid-edit', async () => {
    const { getByPlaceholderText, rerender } = await render(
      <ExerciseNoteField workoutId="w1" exerciseId="ex1" value="Original" />
    );

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Escribiendo…');

    // Simulates the notes query refetching mid-edit with the still-old value.
    rerender(<ExerciseNoteField workoutId="w1" exerciseId="ex1" value="Original" />);

    expect(getByPlaceholderText('¿Cómo fue este ejercicio hoy?').props.value).toBe('Escribiendo…');
  });

  it('queues the note offline when the request never reaches the server, instead of losing it', async () => {
    mockedApi.put.mockRejectedValue(new Error('Network Error'));
    const onSaved = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <ExerciseNoteField workoutId="w1" exerciseId="ex1" value="" onSaved={onSaved} />
    );

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Nota sin señal');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(getByText(/Sin conexión/)).toBeTruthy());
    expect(mockedEnqueue).toHaveBeenCalledWith(
      '/workout-exercise-notes/w1/ex1',
      { notes: 'Nota sin señal' },
      'PUT'
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the server error message when saving fails with a real response', async () => {
    mockedApi.put.mockRejectedValue({ response: { data: { message: 'No se pudo guardar la nota' } } });
    const { getByPlaceholderText, getByText } = await render(<ExerciseNoteField workoutId="w1" exerciseId="ex1" />);

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Algo');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(getByText('No se pudo guardar la nota')).toBeTruthy());
    expect(mockedEnqueue).not.toHaveBeenCalled();
  });
});
