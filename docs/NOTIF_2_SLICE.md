# NOTIF-2 — native notification creates

**Era:** 2 — Notifications  
**Status:** Shipped on native  
**PWA reference:** `apps/web/src/lib/notifications.ts` `createNotification`

---

## Shipped

Native inserts `notifications` rows (in-app feed + badges via NOTIF-3 realtime) when the user acts **on native**:

| Action | Type | Dedupe |
|--------|------|--------|
| Like share (hub, moment detail, story viewer) | `story_like` | `story_like:{storyId}:{actorId}` |
| Comment on share | `story_comment` | — (same as PWA) |
| Accept friend request | `friend_request_accepted` | — (same as PWA) |
| Send DM | `message` | `message:{messageId}` (CHAT-1, prior slice) |

**Respects** `notification_preferences` (`stories_enabled`, `friend_request_enabled`, `messages_enabled`, etc.).

**Does not ship on native (still web / P2O-D):** `friend_online`, `friend_nearby`, `friend_joined_venue`, `venue_popping`, `friend_story`, …

**No OS push** on native from this slice — that is NOTIF-4.

---

## Code map

| File | Role |
|------|------|
| `apps/mobile/src/lib/createNotification.ts` | Insert + prefs |
| `apps/mobile/src/lib/hubShareMutations.ts` | Like → notify owner |
| `apps/mobile/src/components/shares/ShareCommentsBottomSheet.tsx` | Comment → notify owner |
| `apps/mobile/src/components/stories/StoryViewerModal.tsx` | Like in viewer |
| `apps/mobile/src/lib/respondIncomingFriendRequest.ts` | FR accepted |

---

## QA checklist (two accounts: **A** = actor, **B** = recipient)

### Prerequisites

- [ ] Supabase migration `zzz_notifications_messages_realtime.sql` applied (NOTIF-3 badges/toasts).
- [ ] **B** has Stories / Friend requests enabled in Settings → Notifications (or defaults on).

### Story like

1. **B** posts a share (visible on hub).
2. **A** (friend) likes it from **native** hub heart or double-tap.
3. **B** opens Notifications (or hub heart if unread activity): row **“A liked your post”** (or grouped after 4+ actors — [NOTIF_STORY_ENGAGEMENT_GROUPING.md](./NOTIF_STORY_ENGAGEMENT_GROUPING.md)).
4. Unlike + like again: **no duplicate** row (dedupe key).
5. **A** likes own post: **B** gets **no** row.

### Story comment

1. **A** opens comments on **B**’s share, posts a comment.
2. **B** sees `story_comment` in feed with preview text.
3. **A** comments on own share: **no** row for **A**.

### Friend request accepted

1. **B** sends FR to **A**.
2. **A** accepts on native Notifications screen.
3. **B** sees **“A accepted your friend request”** (with avatar preview in row when encoded).

### Regression

- [ ] DM still creates `message` + toast (NOTIF-3).
- [ ] Liking from **PWA** still works; dedupe prevents double row if same user re-likes from both clients.
- [ ] Presence types (`friend_online`, etc.) still only appear when friend uses **web** map — not from native-only session.

### Negative / prefs

- [ ] **B** disables Stories in notification settings → native like/comment from **A** creates **no** row.
- [ ] **B** disables Friend requests → accept still updates graph but **no** `friend_request_accepted` row (matches PWA prefs).

---

## What’s next

**NOTIF-4** — APNs/FCM device push when app is backgrounded.
