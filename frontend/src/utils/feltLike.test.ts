import { feltLikeLabel, feltLikeOptions } from './feltLike';

describe('feltLikeOptions', () => {
  it('exactly matches the keys of feltLikeLabel (no drift between the two)', () => {
    expect(feltLikeOptions.sort()).toEqual(Object.keys(feltLikeLabel).sort());
  });

  it('every option resolves to a non-empty label', () => {
    for (const option of feltLikeOptions) {
      expect(feltLikeLabel[option]).toBeTruthy();
    }
  });
});
