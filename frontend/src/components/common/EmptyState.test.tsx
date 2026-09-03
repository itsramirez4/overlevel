import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and message without a retry button by default', async () => {
    const { getByText, queryByText } = await render(<EmptyState title="Sin datos" message="Nada por aquí." />);
    expect(getByText('Sin datos')).toBeTruthy();
    expect(getByText('Nada por aquí.')).toBeTruthy();
    expect(queryByText('Reintentar')).toBeNull();
  });

  it('shows a retry button that calls onRetry when tapped', async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(<EmptyState title="Error al cargar" onRetry={onRetry} />);

    await fireEvent.press(getByText('Reintentar'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
