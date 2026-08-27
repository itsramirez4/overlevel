import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = () => {
  throw new Error('boom');
};

let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  // React logs the caught error to console.error itself too — silence
  // that expected noise instead of letting it clutter test output.
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children normally when nothing throws', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('catches a render error and shows the fallback instead of crashing', async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(getByText('Algo ha ido mal')).toBeTruthy();
  });

  it('lets the user retry, re-rendering children again', async () => {
    let shouldThrow = true;
    const Maybe = () => {
      if (shouldThrow) throw new Error('boom');
      return <Text>Recovered</Text>;
    };

    const { getByText } = await render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>
    );
    expect(getByText('Algo ha ido mal')).toBeTruthy();

    shouldThrow = false;
    await fireEvent.press(getByText('INTENTAR DE NUEVO'));

    expect(getByText('Recovered')).toBeTruthy();
  });
});
