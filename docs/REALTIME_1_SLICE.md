# REALTIME-1 — chat live (Era 1 Mirror)

PWA reference: `apps/web/src/app/chat/[id]/page.tsx` + `apps/web/src/app/chat/page.tsx`.

Depends on **CHAT-1** (send).

## Shipped

| Feature | Native |
|---------|--------|
| **Thread INSERT sub** | `chat:${chatId}` — peer messages appear without leaving thread |
| **List INSERT/UPDATE sub** | `chat-list:${meId}` — preview + time updates live on Messages tab |
| **Seen on open** | Bulk `messages.seen` + `notifications.read` for thread |
| **Seen on inbound** | Mark single message seen when you receive while thread open |
| **Unread clear** | `emitChatSeenUpdated` → list row unread dot clears |
| **Optimistic merge** | Realtime INSERT replaces optimistic twin (same as PWA) |

## Files

- `apps/mobile/src/lib/chatMessagesRealtime.ts`
- `apps/mobile/src/lib/chatListRealtime.ts`
- `apps/mobile/src/lib/mergeIncomingChatMessage.ts`
- `apps/mobile/src/lib/patchChatPreviewFromMessage.ts`
- `apps/mobile/src/lib/markChatThreadRead.ts`
- `apps/mobile/src/lib/chatSeenEvents.ts`
- `apps/mobile/src/hooks/useChatThread.ts`
- `apps/mobile/src/hooks/useChatPreviews.ts`

## Deferred

- Delete for me (localStorage on PWA)
- Typing indicators
- Push delivery on device
- New chat creation from Messages “New”
- Hub / presence realtime (separate slices)

## QA

1. Device A in thread → Device B sends → A sees bubble without back/nav
2. A on Messages tab → B sends → preview + time update without focus reload
3. Open thread with unread → back to list → dot cleared
4. A sends → still one bubble (optimistic + realtime dedupe)

**Requires:** `messages` on Supabase `supabase_realtime` publication (same as PWA).
