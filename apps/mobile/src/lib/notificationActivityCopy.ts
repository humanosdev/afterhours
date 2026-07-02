import {
  isGroupedStoryEngagementFeedRow,
  isStoryEngagementGroupType,
  storyEngagementCommentLine,
  storyEngagementGroupedSubtext,
  storyEngagementLikeLine,
  storyEngagementSurfaceFromShareFlag,
} from "@intencity/shared";
import type { NotificationWithMeta } from "../types/notification";

export function notificationActivityMessage(n: NotificationWithMeta): string {
  const actorName = n.actor_label || n.actor_display_name || n.actor_username || "Someone";

  if (isGroupedStoryEngagementFeedRow(n) && isStoryEngagementGroupType(n.type)) {
    const surface = storyEngagementSurfaceFromShareFlag(n.story_is_share);
    return storyEngagementGroupedSubtext(n.type, surface);
  }

  switch (n.type) {
    case "friend_online":
      return `${actorName} went online`;
    case "friend_nearby":
      return `${actorName} is nearby`;
    case "friend_joined_venue":
      return `${actorName} is at ${n.venue_name ?? "a venue"}`;
    case "friend_story":
      return `${actorName} posted a new Moment`;
    case "friend_request_received":
      return `${actorName} sent you a friend request`;
    case "friend_request_accepted":
      return `You and ${actorName} are now connected`;
    case "friends_active_bundle":
      return `${actorName} and friends are out right now`;
    case "story_like":
      return storyEngagementLikeLine(
        actorName,
        storyEngagementSurfaceFromShareFlag(n.story_is_share)
      );
    case "story_comment":
      return storyEngagementCommentLine(
        actorName,
        storyEngagementSurfaceFromShareFlag(n.story_is_share),
        n.message_preview
      );
    case "venue_popping":
      return `${n.venue_name ?? "A venue"} is heating up`;
    default:
      return `${actorName} sent an update`;
  }
}
