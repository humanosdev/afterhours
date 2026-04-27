export type NotificationType =
  | "friend_online"
  | "friend_joined_venue"
  | "friends_active_bundle"
  | "friend_story"
  | "friend_request_accepted"
  | "venue_popping";

export type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  type: NotificationType;
  venue_id: string | null;
  created_at: string;
  read: boolean;
};

export type NotificationWithMeta = NotificationRow & {
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_avatar_url?: string | null;
  venue_name?: string | null;
};

