# NOTIF-3 — delivery UX (badges + in-app message toasts)

**Era:** 2 — Notifications (web still writes presence)  
**Status:** Shipped on native  
**PWA reference:** `AppShell.tsx` (toasts + chat badge), `hub/page.tsx` (heart badge)

---

## Shipped

| Feature | Native |
|---------|--------|
| **Hub heart badge** | Unread count on activity notifications (`type != message`) |
| **Chat tab badge** | Unread `message` notification rows (same as PWA) |
| **In-app message toast** | Top glass card on new DM while app open; tap → thread |
| **Realtime** | `messages` INSERT → toast; `notifications` → badge counts (requires migration `zzz_notifications_messages_realtime.sql`) |
| **Fallback** | 25s poll + `chatListRefresh` + max(notification unread, chat preview unread) |
| **Open thread** | Marks message notifications read for that `chat_id` |

**Not in NOTIF-3:** OS push (NOTIF-4), native `createNotification` for likes (NOTIF-2), toasts for likes (feed-only after 4th actor — see [NOTIF_STORY_ENGAGEMENT_GROUPING.md](./NOTIF_STORY_ENGAGEMENT_GROUPING.md)).

---

## PWA vs native — why you may never have seen a “toast”

These are **different systems**:

| Surface | What it is | Requirements |
|---------|------------|--------------|
| **In-app toast** | Banner at top while the app is **open** | Someone sends you a **DM**; you are **not** on that chat thread; Supabase **realtime** delivers the row |
| **Web Push (OS)** | Lock-screen / banner when browser allows | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `push_subscriptions` row, notification permission, **production** service worker |
| **Hub heart badge** | Unread activity (not DMs) | Another account likes your post, sends FR, friend goes online on **web** map, etc. |

**Likes do not show in-app toasts on PWA today** — only the Notifications page (and push if configured). That is expected.

**Native NOTIF-3** matches PWA: **DM toasts only**, no VAPID needed for toasts (uses Supabase realtime). **NOTIF-4** adds APNs/FCM later.

---

## How to test (native dev client)

### Setup

```bash
cd /Users/gleeshshiest/intencity && npm run dev:mobile -- --dev-client --clear
```

Use **two accounts** (two phones/simulators, or one device + PWA):

1. Account **A** — primary device (native app logged in).
2. Account **B** — friend of A (PWA or second device).

Ensure A and B are **accepted friends**.

### Hub heart badge

1. On **B**, like A’s share or send a friend request (anything that creates a non-`message` notification).
2. On **A** native Hub, the ♡ should show a purple count pill.
3. Open **Notifications** on A, tap the row (marks read) → badge should drop.

### Chat tab badge + in-app toast

1. On **A**, stay on **Hub** or **Map** (not inside the chat with B).
2. On **B**, open chat with A and **send a message**.
3. On **A** within a few seconds:
   - Top **glass toast** (“New message” / preview text).
   - **Chat tab** badge increments.
4. Tap toast → opens thread; badge should clear after thread loads.
5. Repeat with **A already on `/chat/[id]`** with B → **no toast** (by design).

### Like grouping (NOTIF story grouping)

1. Have **four different accounts** like the same share of **A**.
2. On **A** → **Notifications**: first three show as separate lines; fourth bundles to **“{name} and others liked your post”**.
3. Fourth like should **not** trigger Web Push if testing from PWA (push suppressed at 4+).

### Realtime not firing?

- Confirm `notifications` table is in Supabase **Realtime** publication (project dashboard).
- Both clients must use the **same** Supabase project as `.env`.

---

## How to test PWA in-app toast (optional)

1. Log in as **A** on PWA, keep tab **visible** (not backgrounded).
2. Log in as **B** in another browser, send **DM** to A.
3. You should see a top toast on A — **not** a browser push.

If nothing appears:

- Check browser console for Supabase realtime errors.
- You were probably on the chat thread already, or testing **likes** (no toast on PWA).

### PWA Web Push (separate)

Requires in `.env.local` (web):

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (optional)

Enable push in **Settings → Notification preferences** on PWA (registers subscription). Then send a like with push title from another user — only if `push_enabled` and distinct-actor rules allow push.

---

## Files

- `apps/mobile/src/providers/NotificationDeliveryProvider.tsx`
- `apps/mobile/src/components/notifications/InAppMessageToastHost.tsx`
- `apps/mobile/src/lib/fetchNotificationUnreadCounts.ts`
- `apps/mobile/src/components/HubTopChrome.tsx`
- `apps/mobile/src/components/FloatingTabBar.tsx`
