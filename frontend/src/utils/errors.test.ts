import { getErrorMessage, hasServerResponse, getResponseStatus } from './errors';

describe('getErrorMessage', () => {
  it('returns the server message from a response error, however it was constructed', () => {
    // Duck-typed on `.response`, not `axios.isAxiosError` — the API client
    // is mocked as a plain object across this codebase's tests, not a real
    // AxiosError, so this has to work for both.
    const err = { response: { data: { message: 'No se pudo guardar' } } };
    expect(getErrorMessage(err, 'fallback')).toBe('No se pudo guardar');
  });

  it('falls back when the response has no message', () => {
    const err = { response: { data: {} } };
    expect(getErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('falls back for a non-response error (e.g. a network failure with no response)', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});

describe('hasServerResponse', () => {
  it('is true when the error carries a response', () => {
    expect(hasServerResponse({ response: { status: 400 } })).toBe(true);
  });

  it('is false for an error with no response (request never reached the server)', () => {
    expect(hasServerResponse(new Error('Network Error'))).toBe(false);
  });
});

describe('getResponseStatus', () => {
  it('reads the status off the response', () => {
    expect(getResponseStatus({ response: { status: 401 } })).toBe(401);
  });

  it('is undefined when there is no response', () => {
    expect(getResponseStatus(new Error('boom'))).toBeUndefined();
  });
});
