import * as SecureStore from "expo-secure-store";
import { supabase } from "./supabase/client";

/** Mirrors `notification_preferences` columns — synced with Supabase (PWA parity). */
export type NotificationPreferences = {
  pushEnabled: boolean;
  friendActivityEnabled: boolean;
  venuePopEnabled: boolean;
  friendRequestEnabled: boolean;
  storiesEnabled: boolean;
  messagesEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

type NotificationPreferencesRow = {
  push_enabled: boolean | null;
  friend_activity_enabled: boolean | null;
  venue_pop_enabled: boolean | null;
  friend_request_enabled: boolean | null;
  stories_enabled: boolean | null;
  messages_enabled: boolean | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

const STORAGE_KEY = "intencity_notification_preferences_v1";

let memoryPrefs: NotificationPreferences | null = null;

const SELECT_COLUMNS =
  "push_enabled, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, messages_enabled, quiet_hours_start, quiet_hours_end";

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    pushEnabled: true,
    friendActivityEnabled: true,
    venuePopEnabled: true,
    friendRequestEnabled: true,
    storiesEnabled: true,
    messagesEnabled: true,
    quietStart: "",
    quietEnd: "",
  };
}

export function getCachedNotificationPreferences(): NotificationPreferences {
  return memoryPrefs ?? defaultNotificationPreferences();
}

export function prefsEqual(a: NotificationPreferences, b: NotificationPreferences): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function quietFromDb(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).slice(0, 5);
}

function rowToPrefs(row: NotificationPreferencesRow | null): NotificationPreferences {
  if (!row) return defaultNotificationPreferences();
  return {
    pushEnabled: row.push_enabled ?? true,
    friendActivityEnabled: row.friend_activity_enabled ?? true,
    venuePopEnabled: row.venue_pop_enabled ?? true,
    friendRequestEnabled: row.friend_request_enabled ?? true,
    storiesEnabled: row.stories_enabled ?? true,
    messagesEnabled: row.messages_enabled ?? true,
    quietStart: quietFromDb(row.quiet_hours_start),
    quietEnd: quietFromDb(row.quiet_hours_end),
  };
}

async function loadCachedPreferences(): Promise<NotificationPreferences> {
  if (memoryPrefs) return memoryPrefs;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) {
      memoryPrefs = defaultNotificationPreferences();
      return memoryPrefs;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    memoryPrefs = { ...defaultNotificationPreferences(), ...parsed };
    return memoryPrefs;
  } catch {
    memoryPrefs = defaultNotificationPreferences();
    return memoryPrefs;
  }
}

async function cachePreferences(prefs: NotificationPreferences): Promise<void> {
  memoryPrefs = prefs;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* cache optional */
  }
}

/** Load from Supabase; falls back to SecureStore cache when offline or no row. */
export async function loadNotificationPreferences(
  userId: string | undefined
): Promise<NotificationPreferences> {
  if (!userId) return loadCachedPreferences();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return loadCachedPreferences();
  }

  const prefs = rowToPrefs(data as NotificationPreferencesRow);
  await cachePreferences(prefs);
  return prefs;
}

export type SaveNotificationPreferencesResult =
  | { ok: true }
  | { ok: false; message: string };

/** Upsert server row + local cache — PWA `/settings/notifications` save. */
export async function saveNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences
): Promise<SaveNotificationPreferencesResult> {
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    push_enabled: prefs.pushEnabled,
    friend_activity_enabled: prefs.friendActivityEnabled,
    venue_pop_enabled: prefs.venuePopEnabled,
    friend_request_enabled: prefs.friendRequestEnabled,
    stories_enabled: prefs.storiesEnabled,
    messages_enabled: prefs.messagesEnabled,
    quiet_hours_start: prefs.quietStart.trim() || null,
    quiet_hours_end: prefs.quietEnd.trim() || null,
  });

  if (error) {
    console.warn("saveNotificationPreferences:", error.code, error.message);
    return { ok: false, message: "Could not save notification settings. Please try again." };
  }

  await cachePreferences(prefs);
  return { ok: true };
}
