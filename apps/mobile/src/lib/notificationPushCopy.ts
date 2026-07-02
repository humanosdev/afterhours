import type { NotificationType } from "../types/notification";

export type NotificationPushCopy = {
  title: string;
  body: string;
  route: string;
};

export function pushCopyForNotification(params: {
  type: NotificationType;
  storyId?: string | null;
  /** When set, distinguishes share vs moment for story engagement pushes. */
  storyIsShare?: boolean | null;
  chatId?: string | null;
  messagePreview?: string | null;
  actorLabel?: string | null;
}): NotificationPushCopy | null {
  const actor = params.actorLabel?.trim() || "A friend";

  switch (params.type) {
    case "message":
      if (!params.chatId) return null;
      return {
        title: "New message",
        body: (params.messagePreview?.trim() || "Sent you a message").slice(0, 120),
        route: `/chat/${params.chatId}`,
      };
    case "story_like": {
      if (!params.storyId) return null;
      const isShare = params.storyIsShare === true;
      const isMoment = params.storyIsShare === false;
      return {
        title: isMoment ? "Your moment got a new like" : "Your share got a new like",
        body: isMoment
          ? `${actor} liked your moment.`
          : isShare
            ? `${actor} liked your share.`
            : `${actor} liked your post.`,
        route: `/moments/${params.storyId}`,
      };
    }
    case "story_comment": {
      if (!params.storyId) return null;
      const isShare = params.storyIsShare === true;
      const isMoment = params.storyIsShare === false;
      return {
        title: `${actor} commented`,
        body: (
          params.messagePreview?.trim() ||
          (isMoment
            ? "Left a comment on your moment."
            : isShare
              ? "Left a comment on your share."
              : "Left a comment on your post.")
        ).slice(0, 120),
        route: `/moments/${params.storyId}`,
      };
    }
    case "friend_request_accepted":
      return {
        title: "Friend request accepted",
        body: `${actor} accepted your friend request.`,
        route: "/notifications",
      };
    default:
      return null;
  }
}
