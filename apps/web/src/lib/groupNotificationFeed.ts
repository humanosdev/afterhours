import { groupStoryEngagementFeedItems } from "@intencity/shared";
import type { NotificationWithMeta } from "../../types/notifications";

/** PWA `/notifications` feed — bundle story likes/comments at 4+ distinct actors. */
export function groupNotificationFeedItems(items: NotificationWithMeta[]): NotificationWithMeta[] {
  return groupStoryEngagementFeedItems(items);
}
