import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "expo-router";
import { AppState } from "react-native";
import { InAppMessageToastHost } from "../components/notifications/InAppMessageToastHost";
import { getCachedChatPreviews } from "../lib/chatPreviewsCache";
import { subscribeChatListRefresh } from "../lib/chatListRefresh";
import { fetchNotificationUnreadCounts } from "../lib/fetchNotificationUnreadCounts";
import { subscribeNotificationInbox } from "../lib/notificationsRealtime";
import {
  subscribeIncomingMessages,
  type IncomingMessageRow,
} from "../lib/subscribeIncomingMessages";
import { supabase } from "../lib/supabase/client";
import { BACKGROUND_UNREAD_POLL_MS, FOREGROUND_UNREAD_POLL_MS } from "../lib/backgroundReadPolicy";
import { useAuth } from "./AuthProvider";
import { useAppLifecycle } from "./AppLifecycleProvider";

const TOAST_TTL_MS = 6000;
const MAX_TOASTS = 3;

export type LiveMessageToast = {
  id: string;
  title: string;
  body: string;
  route: string;
  chatId: string | null;
  actorAvatarUrl: string | null;
};

type NotificationDeliveryContextValue = {
  hubActivityUnread: number;
  chatMessageUnread: number;
  refreshUnreadCounts: () => Promise<void>;
};

const NotificationDeliveryContext = createContext<NotificationDeliveryContextValue | null>(null);

export function useNotificationDelivery(): NotificationDeliveryContextValue {
  const ctx = useContext(NotificationDeliveryContext);
  if (!ctx) {
    throw new Error("useNotificationDelivery must be used within NotificationDeliveryProvider");
  }
  return ctx;
}

export function useNotificationDeliveryOptional(): NotificationDeliveryContextValue | null {
  return useContext(NotificationDeliveryContext);
}

function isViewingChat(pathname: string, chatId: string | null | undefined): boolean {
  if (!chatId) return false;
  return pathname.includes(chatId) && pathname.includes("chat");
}

function chatPreviewUnreadCount(userId: string): number {
  const previews = getCachedChatPreviews(userId) ?? [];
  return previews.filter((p) => p.unread).length;
}

/** NOTIF-3 — hub badge, chat tab badge, in-app message toasts (PWA AppShell parity). */
export function NotificationDeliveryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const { user } = useAuth();
  const { isAppForeground } = useAppLifecycle();
  const userId = user?.id;
  const [hubActivityUnread, setHubActivityUnread] = useState(0);
  const [chatMessageUnread, setChatMessageUnread] = useState(0);
  const [toasts, setToasts] = useState<LiveMessageToast[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const recentToastKeysRef = useRef<Set<string>>(new Set());

  const refreshUnreadCounts = useCallback(async () => {
    if (!userId) {
      setHubActivityUnread(0);
      setChatMessageUnread(0);
      return;
    }
    const counts = await fetchNotificationUnreadCounts(userId);
    const previewUnread = chatPreviewUnreadCount(userId);
    setHubActivityUnread(counts.hubActivityUnread);
    setChatMessageUnread(Math.max(counts.chatMessageUnread, previewUnread));
  }, [userId]);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushMessageToast = useCallback(
    (toast: LiveMessageToast) => {
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), toast]);
      const timer = setTimeout(() => dismissToast(toast.id), TOAST_TTL_MS);
      toastTimersRef.current.set(toast.id, timer);
    },
    [dismissToast]
  );

  const showMessageToast = useCallback(
    async (params: {
      toastId: string;
      dedupeKey: string;
      senderId: string;
      chatId: string;
      body: string;
    }) => {
      if (!userId) return;
      if (isViewingChat(pathnameRef.current, params.chatId)) return;

      if (recentToastKeysRef.current.has(params.dedupeKey)) return;
      recentToastKeysRef.current.add(params.dedupeKey);
      setTimeout(() => recentToastKeysRef.current.delete(params.dedupeKey), 4000);

      const { data: actor } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name")
        .eq("id", params.senderId)
        .maybeSingle();

      const title =
        (typeof actor?.display_name === "string" && actor.display_name.trim()) ||
        (typeof actor?.username === "string" && actor.username.trim()) ||
        "New message";

      pushMessageToast({
        id: params.toastId,
        title,
        body: params.body.trim() || "Sent you a message",
        route: `/chat/${params.chatId}`,
        chatId: params.chatId,
        actorAvatarUrl: actor?.avatar_url ?? null,
      });
    },
    [pushMessageToast, userId]
  );

  const onIncomingMessageRow = useCallback(
    (row: IncomingMessageRow) => {
      if (!userId || !row.chat_id) return;
      setChatMessageUnread((n) => n + 1);
      void refreshUnreadCounts();
      void showMessageToast({
        toastId: `msg-${row.id}`,
        dedupeKey: `chat:${row.chat_id}:msg:${row.id}`,
        senderId: row.sender_id,
        chatId: row.chat_id,
        body: row.content.slice(0, 140),
      });
    },
    [refreshUnreadCounts, showMessageToast, userId]
  );

  useEffect(() => {
    void refreshUnreadCounts();
  }, [refreshUnreadCounts]);

  useEffect(() => {
    if (!userId) return;

    const unsubs = [
      subscribeNotificationInbox(supabase, userId, () => {
        void refreshUnreadCounts();
      }),
      subscribeIncomingMessages(supabase, userId, onIncomingMessageRow),
      subscribeChatListRefresh(() => {
        void refreshUnreadCounts();
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [userId, refreshUnreadCounts, onIncomingMessageRow]);

  useEffect(() => {
    if (!userId) return;
    const pollMs = isAppForeground ? FOREGROUND_UNREAD_POLL_MS : BACKGROUND_UNREAD_POLL_MS;
    const id = setInterval(() => {
      void refreshUnreadCounts();
    }, pollMs);
    return () => clearInterval(id);
  }, [userId, refreshUnreadCounts, isAppForeground]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshUnreadCounts();
    });
    return () => sub.remove();
  }, [refreshUnreadCounts]);

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current.values()) clearTimeout(timer);
      toastTimersRef.current.clear();
    };
  }, []);

  const onToastPress = useCallback(
    (toast: LiveMessageToast) => {
      dismissToast(toast.id);
      if (toast.chatId) {
        router.push(`/chat/${toast.chatId}`);
      } else {
        router.push("/chat");
      }
    },
    [dismissToast, router]
  );

  const value = useMemo(
    () => ({
      hubActivityUnread,
      chatMessageUnread,
      refreshUnreadCounts,
    }),
    [hubActivityUnread, chatMessageUnread, refreshUnreadCounts]
  );

  return (
    <NotificationDeliveryContext.Provider value={value}>
      {children}
      <InAppMessageToastHost toasts={toasts} onDismiss={dismissToast} onPress={onToastPress} />
    </NotificationDeliveryContext.Provider>
  );
}
