interface ApiErrorResponse {
  status?: number;
  data?: { message?: unknown };
}

/**
 * Duck-typed on `.response` rather than `axios.isAxiosError` — tests across
 * this codebase mock rejected API calls as plain `{ response: { data } }`
 * objects, not real AxiosError instances, so gating on the axios-specific
 * flag missed them (and would just as easily miss a rejection from
 * anywhere else shaped the same way).
 */
const getApiErrorResponse = (err: unknown): ApiErrorResponse | undefined => {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  return (err as { response?: ApiErrorResponse }).response;
};

/** Every screen's catch block reached for `err.response?.data?.message` off
 * an `any` catch variable — this narrows it properly instead, so `catch`
 * blocks can drop the `: any` annotation `strict` otherwise requires. */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  const message = getApiErrorResponse(err)?.data?.message;
  return typeof message === 'string' ? message : fallback;
};

/** Whether the request reached the server and got a response back — false
 * for a request that never got a response at all (no signal, DNS, timeout),
 * as opposed to one the server rejected. */
export const hasServerResponse = (err: unknown): boolean => getApiErrorResponse(err) !== undefined;

/** HTTP status of the response, if there was one. */
export const getResponseStatus = (err: unknown): number | undefined => getApiErrorResponse(err)?.status;
