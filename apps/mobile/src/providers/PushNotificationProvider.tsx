import { useEffect, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { loadNotificationPreferences } from "../lib/notificationPreferences";
import {
  registerNativePushSubscription,
  unregisterNativePushSubscriptions,
} from "../lib/nativePushSubscription";
import { useAuth } from "./AuthProvider";
import { requestPresenceResume } from "../lib/presenceResumeBus";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function routeFromNotificationData(data: Record<string, unknown> | undefined): string | null {
  const route = data?.route;
  return typeof route === "string" && route.startsWith("/") ? route : null;
}

/** NOTIF-4 — register Expo token, handle notification tap → deep link. */
export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void (async () => {
      const prefs = await loadNotificationPreferences(userId);
      if (cancelled) return;
      if (prefs.pushEnabled) {
        const reg = await registerNativePushSubscription(userId);
        if (__DEV__ && !reg.ok) {
          console.warn("PushNotificationProvider: register failed:", reg.reason);
        }
      } else {
        await unregisterNativePushSubscriptions(userId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      requestPresenceResume();
      const route = routeFromNotificationData(
        response.notification.request.content.data as Record<string, unknown>
      );
      if (!route) return;
      router.push(route as never);
    });
    return () => sub.remove();
  }, [router]);

  /** EVOLVE-4 — friend-activity push wake refreshes presence read model. */
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      requestPresenceResume();
    });
    return () => sub.remove();
  }, []);

  return children;
}
