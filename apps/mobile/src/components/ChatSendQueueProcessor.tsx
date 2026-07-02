import { useEffect, useRef } from "react";
import { flushChatSendQueue } from "../lib/flushChatSendQueue";
import { listQueuedChatSends } from "../lib/chatSendQueue";
import { useAppLifecycle } from "../providers/AppLifecycleProvider";
import { useAuth } from "../providers/AuthProvider";

const FLUSH_INTERVAL_MS = 12_000;

/** Phase 1 — flush queued chat sends on foreground + periodic retry while online. */
export function ChatSendQueueProcessor() {
  const { user } = useAuth();
  const { isAppForeground } = useAppLifecycle();
  const flushingRef = useRef(false);

  useEffect(() => {
    const meId = user?.id;
    if (!meId || !isAppForeground) return;

    const runFlush = async () => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        await flushChatSendQueue(meId);
      } finally {
        flushingRef.current = false;
      }
    };

    void runFlush();

    const interval = setInterval(() => {
      void listQueuedChatSends(meId).then((pending) => {
        if (pending.length > 0) void runFlush();
      });
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.id, isAppForeground]);

  return null;
}
