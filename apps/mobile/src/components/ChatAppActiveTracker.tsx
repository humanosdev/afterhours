import { useAuth } from "../providers/AuthProvider";
import { useAppLifecycle } from "../providers/AppLifecycleProvider";
import { useChatAppActiveHeartbeat } from "../hooks/useChatAppActiveHeartbeat";

/** Phase 5.1 — chat-online heartbeat while app is foreground. */
export function ChatAppActiveTracker() {
  const { user } = useAuth();
  const { isAppForeground } = useAppLifecycle();
  useChatAppActiveHeartbeat(user?.id, Boolean(user?.id) && isAppForeground);
  return null;
}
