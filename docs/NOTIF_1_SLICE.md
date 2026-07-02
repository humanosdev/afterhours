# NOTIF-1 — notifications feed browse (Era 1 prep)

**Era placement:** Optional Mirror prep — **not** notification system parity. Full authority + delivery: [NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md) (**NOTIF-2/3/4**, Era 2+).

PWA reference: `apps/web/src/app/notifications/page.tsx`.

Depends on **CHAT-1** / **REALTIME-1** (message notifications stay in chat, excluded from feed query).

## Shipped (display only)

| Feature | Native |
|---------|--------|
| **Activity feed** | Load `notifications` (excludes `type=message`), enrich actors + venues |
| **Grouping** | 3+ likes/comments on same story → avatar stack row |
| **Tap** | Mark read + navigate (map, moment, profile, comments sheet) |
| **Delete** | Trash removes row(s) including grouped ids |
| **Friend requests** | Accept / Deny (live), block filter, profile snapshot fallback |
| **Realtime** | `friend_requests` + `notifications` postgres channels |

**Who creates rows in Era 1:** still **web/PWA** (+ DB trigger for incoming friend requests). Native only inserts `message` (chat) and `friend_request_accepted` (accept flow).

## Files

- `apps/mobile/src/hooks/useNotificationsScreen.ts`
- `apps/mobile/src/components/notifications/NotificationActivityRow.tsx`
- `apps/mobile/app/(app)/notifications.tsx`
- `apps/mobile/src/lib/fetchNotificationFeed.ts`, `enrichNotifications.ts`, `groupNotifications.ts`, …

## Explicitly Era 2+ (NOTIF-2/3/4)

- Native `createNotification` for likes, comments, presence types
- Push delivery on device
- Hub heart unread badge
- In-app message toast
- Chat tab unread badge
- `notification_preferences` → Supabase from settings

## QA

1. Trigger story like from **PWA** → appears on native notifications (realtime)
2. Tap row → marks read + opens target
3. Delete → row gone
4. Incoming friend request → Accept → requester gets accepted notification
5. Empty state when no rows
6. **Era 1 expectation:** no native like → notification; no hub badge; no message toast
