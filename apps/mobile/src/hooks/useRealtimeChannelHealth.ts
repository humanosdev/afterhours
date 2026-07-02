import { useCallback, useState } from "react";

/** Track Supabase Realtime channel SUBSCRIBED state for poll gating. */
export function useRealtimeChannelHealth(): {
  realtimeHealthy: boolean;
  onChannelStatus: (status: string) => void;
} {
  const [realtimeHealthy, setRealtimeHealthy] = useState(false);

  const onChannelStatus = useCallback((status: string) => {
    setRealtimeHealthy(status === "SUBSCRIBED");
  }, []);

  return { realtimeHealthy, onChannelStatus };
}
