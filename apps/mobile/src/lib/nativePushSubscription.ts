import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase/client";

const EXPO_ENDPOINT_PREFIX = "expo:";

function isNotificationPermissionGranted(
  perm: Notifications.NotificationPermissionsStatus
): boolean {
  const row = perm as Notifications.NotificationPermissionsStatus & {
    granted?: boolean;
    status?: string;
  };
  if (row.granted === true || row.status === "granted") return true;
  const iosStatus = perm.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export type RegisterNativePushResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

function resolveExpoProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId?.trim();
  if (fromExtra) return fromExtra;
  const env = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  return env || null;
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Intencity",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120, 80, 120],
    lightColor: "#3b66ff",
  });
}

/** Request permission, obtain Expo push token, upsert `push_subscriptions` row. */
export async function registerNativePushSubscription(
  userId: string
): Promise<RegisterNativePushResult> {
  if (!Device.isDevice) {
    return { ok: false, reason: "simulator" };
  }

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    return { ok: false, reason: "missing_project_id" };
  }

  await ensureAndroidNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  let granted = isNotificationPermissionGranted(existing);
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = isNotificationPermissionGranted(requested);
  }
  if (!granted) {
    return { ok: false, reason: "permission_denied" };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (e) {
    console.warn("getExpoPushTokenAsync:", e);
    return { ok: false, reason: "token_failed" };
  }

  if (!token?.trim()) {
    return { ok: false, reason: "empty_token" };
  }

  const endpoint = `${EXPO_ENDPOINT_PREFIX}${token}`;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: "expo",
      auth: "expo",
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.warn("registerNativePushSubscription:", error.message);
    return { ok: false, reason: "db_error" };
  }

  return { ok: true, token };
}

export async function unregisterNativePushSubscriptions(userId: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .like("endpoint", `${EXPO_ENDPOINT_PREFIX}%`);
  if (error) {
    console.warn("unregisterNativePushSubscriptions:", error.message);
  }
}
