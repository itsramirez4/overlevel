import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditWorkoutDialog } from './EditWorkoutDialog';

describe('EditWorkoutDialog', () => {
  it('prefills title, notes, felt_like and the date from the workout', async () => {
    const { getByPlaceholderText, getByText } = await render(
      <EditWorkoutDialog
        visible
        initialTitle="Push Day"
        initialNotes="Buen entreno"
        initialFeltLike="good"
        initialStartedAt="2026-01-15T10:00:00Z"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByPlaceholderText('Nombre del entrenamiento').props.value).toBe('Push Day');
    expect(getByPlaceholderText('Cómo fue el entrenamiento…').props.value).toBe('Buen entreno');
    expect(getByText(/enero de 2026/)).toBeTruthy();
  });

  it('saves the unchanged started_at (converted to ISO) alongside the other fields', async () => {
    const onSave = jest.fn();
    const { getByText } = await render(
      <EditWorkoutDialog
        visible
        initialTitle="Push Day"
        initialStartedAt="2026-01-15T10:00:00Z"
        onSave={onSave}
        onCancel={jest.fn()}
      />
    );

    await fireEvent.press(getByText('Guardar cambios'));

    expect(onSave).toHaveBeenCalledWith('Push Day', undefined, undefined, '2026-01-15T10:00:00.000Z');
  });

  it('re-syncs its fields when the underlying workout changes while open', async () => {
    const { getByPlaceholderText, rerender } = await render(
      <EditWorkoutDialog
        visible
        initialTitle="Old Title"
        initialStartedAt="2026-01-01T00:00:00Z"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    rerender(
      <EditWorkoutDialog
        visible
        initialTitle="New Title"
        initialStartedAt="2026-02-01T00:00:00Z"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    await waitFor(() => expect(getByPlaceholderText('Nombre del entrenamiento').props.value).toBe('New Title'));
  });
});
