import { bumpChatListRefresh } from "./chatListRefresh";
import { bumpNotificationFeedRefresh } from "./notificationFeedRefresh";
import { requestPresenceResume } from "./presenceResumeBus";

/** Phase 3 — immediate read refresh when app returns to foreground (reads only). */
export function runForegroundResumeBurst(): void {
  requestPresenceResume();
  bumpChatListRefresh();
  bumpNotificationFeedRefresh();
}
