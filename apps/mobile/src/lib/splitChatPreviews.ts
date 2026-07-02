import type { ChatInboxPrefs } from "./chatInboxPrefs";
import { isChatHidden, isChatRequestApproved } from "./chatInboxPrefs";
import type { ChatConversationPreview } from "../types/chatPreview";

export function splitChatPreviews(
  previews: ChatConversationPreview[],
  friendIdSet: Set<string>,
  prefs: ChatInboxPrefs
): { chatPreviews: ChatConversationPreview[]; requestPreviews: ChatConversationPreview[] } {
  const chatPreviews: ChatConversationPreview[] = [];
  const requestPreviews: ChatConversationPreview[] = [];

  for (const preview of previews) {
    if (isChatHidden(prefs, preview.chatId)) continue;

    const isFriend = Boolean(preview.peerId && friendIdSet.has(preview.peerId));
    const approved = isChatRequestApproved(prefs, preview.chatId);

    if (isFriend || approved) chatPreviews.push(preview);
    else requestPreviews.push(preview);
  }

  return { chatPreviews, requestPreviews };
}
