import { getSupabaseUrl } from "./env";
import { isNetworkRequestFailed } from "./networkErrors";
import { supabase } from "./supabase/client";
import type { NotificationType } from "../types/notification";

export type PushNotifyParams = {
  recipientId: string;
  notificationId: string;
  title: string;
  body: string;
  route: string;
  notificationType?: NotificationType;
  storyId?: string | null;
};

type PushNotifyResponse = {
  ok?: boolean;
  error?: string;
  sent?: number;
  skipped?: string | null;
};

/** Fan out device push via Supabase Edge Function (Phase 1 — no web product route). */
export async function requestPushNotify(params: PushNotifyParams): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    if (__DEV__) console.warn("requestPushNotify: no session");
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke<PushNotifyResponse>("push-notify", {
      body: {
        userId: params.recipientId,
        notificationId: params.notificationId,
        title: params.title,
        body: params.body,
        route: params.route,
        notificationType: params.notificationType,
        storyId: params.storyId ?? undefined,
      },
    });

    if (error) {
      if (__DEV__) console.warn("requestPushNotify edge:", error.message);
      return;
    }

    if (data && data.ok === false) {
      if (__DEV__) console.warn("requestPushNotify:", data.error ?? "push_failed");
    }
  } catch (e) {
    if (__DEV__) {
      console.warn(
        "requestPushNotify failed:",
        isNetworkRequestFailed(e) ? "network" : e instanceof Error ? e.message : e
      );
    }
  }
}

/** Deploy target — useful for diagnostics in dev builds. */
export function getPushNotifyEndpointHint(): string {
  return `${getSupabaseUrl().replace(/\/$/, "")}/functions/v1/push-notify`;
}
