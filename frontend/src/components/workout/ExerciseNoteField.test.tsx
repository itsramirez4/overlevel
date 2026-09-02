import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ExerciseNoteField } from './ExerciseNoteField';

describe('ExerciseNoteField', () => {
  it('shows the existing note text', async () => {
    const { getByPlaceholderText } = await render(<ExerciseNoteField value="Fue duro hoy" onSave={jest.fn()} />);
    expect(getByPlaceholderText('¿Cómo fue este ejercicio hoy?').props.value).toBe('Fue duro hoy');
  });

  it('saves the new text on blur when it changed', async () => {
    const onSave = jest.fn();
    const { getByPlaceholderText } = await render(<ExerciseNoteField value="" onSave={onSave} />);

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Nueva nota');
    await fireEvent(input, 'blur');

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Nueva nota'));
  });

  it('does not save on blur when the text never changed', async () => {
    const onSave = jest.fn();
    const { getByPlaceholderText } = await render(<ExerciseNoteField value="Igual" onSave={onSave} />);

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent(input, 'blur');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not re-sync from a value prop change while the user is mid-edit', async () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, rerender } = await render(<ExerciseNoteField value="Original" onSave={onSave} />);

    const input = getByPlaceholderText('¿Cómo fue este ejercicio hoy?');
    await fireEvent.changeText(input, 'Escribiendo…');

    // Simulates the notes query refetching mid-edit with the still-old value.
    rerender(<ExerciseNoteField value="Original" onSave={onSave} />);

    expect(getByPlaceholderText('¿Cómo fue este ejercicio hoy?').props.value).toBe('Escribiendo…');
  });
});
