import { workoutStore } from './workoutStore';

/**
 * onRehydrateStorage's returned callback only runs through zustand's
 * persist internals on a real AsyncStorage read, which the jest mock
 * always resolves cleanly — there's no way to make it actually fail from
 * outside. Grabbing the exact callback configured on the store and calling
 * it directly is what actually exercises the corrupted-storage branch.
 */
describe('workoutStore onRehydrateStorage', () => {
  beforeEach(() => {
    workoutStore.setState({ hasHydrated: false });
  });

  it('still flips hasHydrated when rehydration fails (corrupted or incompatible persisted data)', () => {
    const onRehydrateStorage = workoutStore.persist.getOptions().onRehydrateStorage;
    const callback = onRehydrateStorage?.(workoutStore.getState());

    // `state` undefined either way (zustand's real failure case) — without
    // the fallback this fixed, hasHydrated would stay stuck false forever,
    // permanently disabling "start workout" until reinstall.
    callback?.(undefined, new Error('corrupted JSON'));

    expect(workoutStore.getState().hasHydrated).toBe(true);
  });

  it('flips hasHydrated via the rehydrated state on a normal, successful rehydration', () => {
    const onRehydrateStorage = workoutStore.persist.getOptions().onRehydrateStorage;
    const callback = onRehydrateStorage?.(workoutStore.getState());

    callback?.(workoutStore.getState(), undefined);

    expect(workoutStore.getState().hasHydrated).toBe(true);
  });
});
