import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/constants';

type WakeState = 'checking' | 'waking' | 'ready';

/**
 * Render's free tier sleeps after 15 min idle and takes up to ~1 min to wake
 * on the next request. Pings /health (outside the /api prefix, no auth
 * needed) in a retry loop so the UI can tell "briefly loading" apart from
 * "cold start in progress" — without this the app just sits on a spinner
 * that reads as broken for up to a minute.
 *
 * Stays 'checking' for the first 2.5s so a normal (already-awake) launch
 * never shows the wake-up message at all — only a request that's actually
 * taking a while flips it to 'waking'.
 */
export function useBackendWakeUp(): WakeState {
  const [state, setState] = useState<WakeState>('checking');

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      setState((s) => (s === 'checking' ? 'waking' : s));
    }, 2500);

    const poll = async () => {
      while (!cancelled) {
        try {
          await axios.get(`${API_URL}/health`, { timeout: 10000 });
          if (!cancelled) setState('ready');
          return;
        } catch {
          if (cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);

  return state;
}
