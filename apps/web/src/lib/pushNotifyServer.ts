import {
  isWithinQuietHours,
  shouldSendPushForStoryEngagement,
  type StoryEngagementGroupType,
} from "@intencity/shared";
import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "@/lib/appConfig";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const EXPO_ENDPOINT_PREFIX = "expo:";

export function isExpoPushEndpoint(endpoint: string): boolean {
  return endpoint.startsWith(EXPO_ENDPOINT_PREFIX);
}

export function expoTokenFromEndpoint(endpoint: string): string | null {
  if (!isExpoPushEndpoint(endpoint)) return null;
  const token = endpoint.slice(EXPO_ENDPOINT_PREFIX.length).trim();
  return token && Expo.isExpoPushToken(token) ? token : null;
}

async function countDistinctStoryEngagementActors(
  admin: SupabaseClient,
  recipientId: string,
  storyId: string,
  type: StoryEngagementGroupType
): Promise<number> {
  const { data, error } = await admin
    .from("notifications")
    .select("actor_user_id")
    .eq("recipient_user_id", recipientId)
    .eq("story_id", storyId)
    .eq("type", type);
  if (error) {
    console.warn("countDistinctStoryEngagementActors:", error.message);
    return 0;
  }
  return new Set((data ?? []).map((r) => r.actor_user_id)).size;
}

export type SendPushParams = {
  userId: string;
  title: string;
  body: string;
  route?: string;
  notificationType?: string;
  storyId?: string | null;
};

export type SendPushResult = {
  ok: boolean;
  sent: number;
  skipped?: string;
  error?: string;
};

/** Fan out Web Push + Expo push for one recipient (service role). */
export async function sendPushToUser(
  admin: SupabaseClient,
  params: SendPushParams
): Promise<SendPushResult> {
  const { userId, title, body } = params;
  const route = params.route ?? "/notifications";

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("push_enabled, quiet_hours_start, quiet_hours_end")
    .eq("user_id", userId)
    .maybeSingle();

  if ((prefs?.push_enabled ?? true) === false) {
    return { ok: true, sent: 0, skipped: "push_disabled" };
  }

  if (isWithinQuietHours(prefs?.quiet_hours_start, prefs?.quiet_hours_end)) {
    return { ok: true, sent: 0, skipped: "quiet_hours" };
  }

  if (
    params.storyId &&
    (params.notificationType === "story_like" || params.notificationType === "story_comment")
  ) {
    const distinctActors = await countDistinctStoryEngagementActors(
      admin,
      userId,
      params.storyId,
      params.notificationType
    );
    if (!shouldSendPushForStoryEngagement(distinctActors)) {
      return { ok: true, sent: 0, skipped: "story_engagement_grouped" };
    }
  }

  const { data: rows, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    return { ok: false, sent: 0, error: "subscriptions_fetch_failed" };
  }

  const subscriptions = (rows ?? []) as PushRow[];
  if (subscriptions.length === 0) {
    return { ok: true, sent: 0 };
  }

  const payload = JSON.stringify({ title, body, route });
  let sent = 0;

  const webRows = subscriptions.filter((r) => !isExpoPushEndpoint(r.endpoint));
  const expoTokens = subscriptions
    .map((r) => expoTokenFromEndpoint(r.endpoint))
    .filter((t): t is string => Boolean(t));

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? `mailto:${appConfig.supportEmail}`;

  if (webRows.length > 0 && vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    for (const row of webRows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload
        );
        sent += 1;
      } catch {
        /* per-subscription */
      }
    }
  }

  const expoAccessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (expoTokens.length > 0) {
    const expo = new Expo(expoAccessToken ? { accessToken: expoAccessToken } : undefined);
    const messages: ExpoPushMessage[] = expoTokens.map((to) => ({
      to,
      title,
      body,
      data: { route },
      sound: "default",
    }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        sent += tickets.filter((t) => t.status === "ok").length;
      } catch (e) {
        console.warn("expo push chunk failed:", e);
      }
    }
  }

  return { ok: true, sent };
}
