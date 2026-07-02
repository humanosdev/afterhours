import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { getOrCreateChat } from "../lib/getOrCreateChat";
import { useAuth } from "../providers/AuthProvider";

/** Open an existing 1:1 thread or create one — mirrors web `startChatWithFriend`. */
export function useOpenChatWithUser() {
  const router = useRouter();
  const { user } = useAuth();
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const openChatWithUser = useCallback(
    async (otherUserId: string) => {
      if (!user?.id || !otherUserId || openingUserId) return;
      setOpeningUserId(otherUserId);
      const result = await getOrCreateChat(user.id, otherUserId);
      setOpeningUserId(null);
      if ("error" in result) {
        Alert.alert("Could not open chat", "Try again in a moment.");
        return;
      }
      router.push(`/chat/${result.chatId}`);
    },
    [user?.id, openingUserId, router]
  );

  return { openChatWithUser, openingUserId, isOpeningChat: openingUserId != null };
}
