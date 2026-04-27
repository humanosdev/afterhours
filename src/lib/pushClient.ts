"use client";

import { supabase } from "@/lib/supabaseClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function registerPushSubscription(userId: string) {
  try {
    if (typeof window === "undefined") return { ok: false, reason: "no_window" as const };
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, reason: "unsupported" as const };
    }
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return { ok: false, reason: "missing_vapid" as const };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "permission_denied" as const };

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const keys = json.keys ?? {};
    if (!endpoint || !keys.p256dh || !keys.auth) {
      return { ok: false, reason: "invalid_subscription" as const };
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    );
    if (error) return { ok: false, reason: "db_error" as const };
    return { ok: true as const };
  } catch {
    return { ok: false, reason: "subscribe_failed" as const };
  }
}
