import { render, fireEvent } from '@testing-library/react-native';
import { ProgressChart } from './ProgressChart';

// This chart lives inside a container marked `accessible` for a single
// summarizing accessibilityLabel (see ProgressChart.tsx), which collapses
// its descendants from the accessibility tree — so every query here needs
// includeHiddenElements to still reach the chart box and tooltip text.
const opts = { includeHiddenElements: true };

const points = [
  { date: '2026-01-01T00:00:00Z', value: 60 },
  { date: '2026-01-08T00:00:00Z', value: 65 },
  { date: '2026-01-15T00:00:00Z', value: 70 },
];

// PanResponder's onResponderGrant/onResponderMove wrappers compute a touch
// centroid from event.touchHistory before invoking our callbacks — real
// touches populate this via RN's native responder system, but RNTL's
// fireEvent doesn't, so grant/move events need a minimal fake here or they
// throw reading `touchBank` before ever reaching our code.
const touchHistoryAt = (x: number) => ({
  touchBank: [
    { touchActive: true, currentTimeStamp: 1, currentPageX: x, currentPageY: 0, previousPageX: x, previousPageY: 0 },
  ],
  numberActiveTouches: 1,
  indexOfSingleActiveTouch: 0,
  mostRecentTimeStamp: 1,
});

describe('ProgressChart', () => {
  it('renders nothing for an empty series', async () => {
    const { toJSON } = await render(<ProgressChart points={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('shows no tooltip before the chart is touched', async () => {
    const { getByTestId, queryByTestId } = await render(<ProgressChart points={points} unit="kg" />);
    const box = getByTestId('progress-chart-box', opts);
    await fireEvent(box, 'layout', { nativeEvent: { layout: { width: 300, height: 140, x: 0, y: 0 } } });
    expect(queryByTestId('chart-tooltip', opts)).toBeNull();
  });

  it('shows a tooltip with the nearest point on touch, and hides it on release', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(<ProgressChart points={points} unit="kg" />);
    const box = getByTestId('progress-chart-box', opts);
    await fireEvent(box, 'layout', { nativeEvent: { layout: { width: 300, height: 140, x: 0, y: 0 } } });

    await fireEvent(box, 'responderGrant', { touchHistory: touchHistoryAt(290), nativeEvent: { locationX: 290 } });
    expect(getByTestId('chart-tooltip', opts)).toBeTruthy();
    expect(getByText('70kg', opts)).toBeTruthy();

    await fireEvent(box, 'responderRelease', {});
    expect(queryByTestId('chart-tooltip', opts)).toBeNull();
  });

  it('updates the tooltip as the touch moves across points', async () => {
    const { getByTestId, getByText } = await render(<ProgressChart points={points} unit="kg" />);
    const box = getByTestId('progress-chart-box', opts);
    await fireEvent(box, 'layout', { nativeEvent: { layout: { width: 300, height: 140, x: 0, y: 0 } } });

    await fireEvent(box, 'responderGrant', { touchHistory: touchHistoryAt(0), nativeEvent: { locationX: 0 } });
    expect(getByText('60kg', opts)).toBeTruthy();

    await fireEvent(box, 'responderMove', { touchHistory: touchHistoryAt(150), nativeEvent: { locationX: 150 } });
    expect(getByText('65kg', opts)).toBeTruthy();
  });
});
