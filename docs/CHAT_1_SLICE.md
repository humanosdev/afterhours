# CHAT-1 — message send (Era 1 Mirror)

PWA reference: `apps/web/src/app/chat/[id]/page.tsx` (`send()`).

## Shipped

| Feature | Native |
|---------|--------|
| **Composer** | Text input + Send (disabled when empty / blocked / sending) |
| **Optimistic bubble** | Temp id replaced on insert success |
| **Insert** | `messages` row (`chat_id`, `sender_id`, `receiver_id`, `content`) |
| **Chat preview** | `chats.last_message` + `updated_at` |
| **In-app notify** | `notifications` insert (`type: message`, dedupe) — no web push API on native |
| **List refresh** | `bumpChatListRefresh` + Messages tab `useFocusEffect` reload |
| **Block gate** | Same copy as PWA when either party blocked |

## Files

- `apps/mobile/src/lib/sendChatMessage.ts`
- `apps/mobile/src/lib/createNotification.ts` (message type only)
- `apps/mobile/src/lib/chatListRefresh.ts`
- `apps/mobile/src/hooks/useChatThread.ts` — `send()`
- `apps/mobile/src/components/chat/ChatThreadShell.tsx`
- `apps/mobile/app/(app)/chat/[id].tsx`

## Deferred (REALTIME-1+ / later)

- See [REALTIME_1_SLICE.md](./REALTIME_1_SLICE.md) for live thread + list (**shipped**)
- Delete for me (localStorage on PWA)
- Seen / unread authoritative sync
- Native push delivery (`/api/push/notify`)
- New chat from Messages “New” pill

## QA

1. Open thread from Messages → type → Send → bubble appears, input clears
2. Back to Messages → preview shows last line
3. Second device / PWA: message appears after refresh (not live until REALTIME-1)
4. Blocked pair → banner, composer hidden
5. Airplane mode send → error, text restored (optimistic removed)
