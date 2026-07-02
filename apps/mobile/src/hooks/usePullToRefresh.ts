import { useCallback, useRef, useState } from "react";

/** Wraps async reload for `RefreshControl` — only one pull at a time. */
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);

  const handleRefresh = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    void Promise.resolve(onRefresh()).finally(() => {
      busyRef.current = false;
      setRefreshing(false);
    });
  }, [onRefresh]);

  return { refreshing, onRefresh: handleRefresh };
}
