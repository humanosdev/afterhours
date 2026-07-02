import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_POLL_FALLBACK_MS, resolveRealtimePollFallbackMs } from "../lib/backgroundReadPolicy";
import {
  getCachedChatPreviews,
  setCachedChatPreviews,
} from "../lib/chatPreviewsCache";
import { subscribeChatListChanges } from "../lib/chatListRealtime";
import { subscribeChatListRefresh } from "../lib/chatListRefresh";
import { subscribeChatSeenUpdated } from "../lib/chatSeenEvents";
import {
  clearChatPreviewUnread,
  patchChatPreviewFromMessage,
} from "../lib/patchChatPreviewFromMessage";
import { fetchChatPreviews } from "../lib/fetchChatPreviews";
import { supabase } from "../lib/supabase/client";
import { useRealtimeChannelHealth } from "./useRealtimeChannelHealth";
import type { ChatConversationPreview } from "../types/chatPreview";

export function useChatPreviews(userId: string | undefined) {
  const [previews, setPreviews] = useState<ChatConversationPreview[]>(() =>
    userId ? (getCachedChatPreviews(userId) ?? []) : []
  );
  const [loading, setLoading] = useState(
    () => Boolean(userId) && getCachedChatPreviews(userId ?? "") == null
  );
  const [error, setError] = useState<string | null>(null);
  const { realtimeHealthy, onChannelStatus } = useRealtimeChannelHealth();

  const reload = useCallback((opts?: { quiet?: boolean }) => {
    if (!userId) return;
    if (!opts?.quiet) setLoading(true);
    void fetchChatPreviews(userId).then(({ previews: next, error: nextError }) => {
      setCachedChatPreviews(userId, next);
      setPreviews(next);
      setError(nextError);
      setLoading(false);
    });
  }, [userId]);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!userId) {
      setPreviews([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedChatPreviews(userId);
    if (cached) {
      setPreviews(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    reloadRef.current({ quiet: cached != null });

    const quietReload = () => reloadRef.current({ quiet: true });

    const unsubs = [
      subscribeChatListRefresh(quietReload),
      subscribeChatSeenUpdated((chatId) => {
        setPreviews((prev) => {
          const next = clearChatPreviewUnread(prev, chatId);
          if (userId) setCachedChatPreviews(userId, next);
          return next;
        });
      }),
    ];

    if (userId) {
      unsubs.push(
        subscribeChatListChanges(supabase, userId, {
          onInsert: (row) => {
            setPreviews((prev) => {
              const next = patchChatPreviewFromMessage(prev, row, userId, "insert");
              if (!next) {
                quietReload();
                return prev;
              }
              setCachedChatPreviews(userId, next);
              return next;
            });
          },
          onUpdate: (row) => {
            setPreviews((prev) => {
              const next = patchChatPreviewFromMessage(prev, row, userId, "update");
              if (!next) return prev;
              setCachedChatPreviews(userId, next);
              return next;
            });
          },
          onChannelStatus,
        })
      );
    }

    return () => {
      for (const u of unsubs) u();
    };
  }, [userId, onChannelStatus]);

  useEffect(() => {
    if (!userId) return;
    const pollMs = resolveRealtimePollFallbackMs(realtimeHealthy, CHAT_POLL_FALLBACK_MS);
    if (pollMs == null) return;
    reloadRef.current({ quiet: true });
    const id = setInterval(() => reloadRef.current({ quiet: true }), pollMs);
    return () => clearInterval(id);
  }, [userId, realtimeHealthy]);

  return { previews, loading, error, reload };
}
