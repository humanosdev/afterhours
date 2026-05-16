import { useEffect, useState } from "react";
import { fetchChatPreviews } from "../lib/fetchChatPreviews";
import type { ChatConversationPreview } from "../types/chatPreview";

export function useChatPreviews(userId: string | undefined) {
  const [previews, setPreviews] = useState<ChatConversationPreview[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPreviews([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchChatPreviews(userId).then(({ previews: next, error: nextError }) => {
      if (cancelled) return;
      setPreviews(next);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { previews, loading, error };
}
