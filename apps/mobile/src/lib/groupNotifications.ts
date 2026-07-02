import { groupStoryEngagementFeedItems } from "@intencity/shared";
import type { NotificationWithMeta } from "../types/notification";

/** PWA notifications feed — Instagram-style bundle at 4+ distinct actors per post. */
export function groupNotificationItems(items: NotificationWithMeta[]): NotificationWithMeta[] {
  return groupStoryEngagementFeedItems(items) as NotificationWithMeta[];
}
