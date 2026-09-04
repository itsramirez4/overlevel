import * as Haptics from 'expo-haptics';
import { hapticSetLogged, hapticPr, hapticWorkoutComplete } from './haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

const mockedHaptics = Haptics as jest.Mocked<typeof Haptics>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('haptics', () => {
  it('hapticSetLogged fires a light impact', () => {
    hapticSetLogged();
    expect(mockedHaptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('hapticPr fires a success notification', () => {
    hapticPr();
    expect(mockedHaptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('hapticWorkoutComplete fires a success notification', () => {
    hapticWorkoutComplete();
    expect(mockedHaptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('never throws even if the underlying call rejects', async () => {
    mockedHaptics.impactAsync.mockRejectedValueOnce(new Error('no haptics on this device'));
    expect(() => hapticSetLogged()).not.toThrow();
  });
});
