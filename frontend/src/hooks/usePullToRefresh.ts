import { useCallback, useState } from 'react';

/** Wires a screen's query refetch(es) up to RN's pull-to-refresh gesture —
 * pass a single refetch or `() => Promise.all([...])` for several queries. */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
