export type NotificationType =
  | "friend_online"
  | "friend_nearby"
  | "friend_joined_venue"
  | "friends_active_bundle"
  | "friend_story"
  | "friend_request_received"
  | "friend_request_accepted"
  | "venue_popping"
  | "story_like"
  | "story_comment"
  | "message";

export type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  type: NotificationType;
  venue_id: string | null;
  story_id?: string | null;
  comment_id?: string | null;
  chat_id?: string | null;
  message_preview?: string | null;
  created_at: string;
  read: boolean;
};

export type NotificationWithMeta = NotificationRow & {
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_avatar_url?: string | null;
  venue_name?: string | null;
  /** Synthetic grouped row: underlying notification ids */
  grouped_row_ids?: string[];
  /** Up to three distinct actors in a grouped bundle (for avatar stack) */
  group_preview_avatars?: (string | null)[];
  group_preview_usernames?: (string | null)[];
  group_actor_count?: number;
};

