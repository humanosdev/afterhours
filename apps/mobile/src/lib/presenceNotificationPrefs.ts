import { supabase } from "./supabase/client";

export async function getNotificationPreferences(userIds: string[]) {
  const prefs = new Map<string, { online: boolean; venue: boolean }>();
  if (userIds.length === 0) return prefs;

  const { data } = await supabase
    .from("notification_preferences")
    .select("user_id, friend_activity_enabled")
    .in("user_id", userIds);

  const rows = (data ?? []) as Array<{ user_id: string; friend_activity_enabled: boolean | null }>;
  for (const uid of userIds) {
    const row = rows.find((x) => x.user_id === uid);
    const enabled = row?.friend_activity_enabled ?? true;
    prefs.set(uid, { online: enabled, venue: enabled });
  }
  return prefs;
}
