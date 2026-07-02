# Story like / comment notification grouping

**Status:** Shipped in `@intencity/shared` (PWA + native feed)  
**Policy:** Instagram-style — individual feed lines for the first three distinct actors; bundle from the fourth onward.

---

## Instagram behavior (research summary)

- Multiple likes on the same post are **aggregated**, not sent as N separate alerts.
- Typical copy: **“John Doe and 9 others liked your photo.”**
- Aggregation reduces notification fatigue while keeping activity visible in the **Activity** tab.
- Push and in-app surfaces follow the same batching idea (not one ping per like after a threshold).

**Intencity mapping:** threshold = **4 distinct actors** per post per type (`story_like` vs `story_comment` are separate buckets).

---

## Product rules

| Distinct actors (same post + type) | Activity feed | Web Push |
|-----------------------------------|---------------|----------|
| 1–3 | One row per actor | ✅ If `push_enabled` + caller passes title/body |
| 4+ | **One bundled row** — title = latest actor, subtext = “and others liked your post” | ❌ Feed-only (no OS spam) |

- **DB:** Still one `notifications` row per liker/commenter (`dedupe_key` on likes: `story_like:{storyId}:{likerId}`).
- **Display:** `groupStoryEngagementFeedItems()` collapses 4+ rows in the feed UI only.
- **Push:** `createNotification` skips `/api/push/notify` when distinct actor count ≥ 4 after insert.

---

## Code

| Piece | Location |
|-------|----------|
| Shared logic | `packages/shared/src/notifications/storyEngagementGrouping.ts` |
| PWA feed | `apps/web/src/lib/groupNotificationFeed.ts` |
| Native feed | `apps/mobile/src/lib/groupNotifications.ts` |
| Push gate | `apps/web/src/lib/notifications.ts` |

---

## QA

1. Three friends like your share on PWA → three separate lines on `/notifications` (native feed matches).
2. Fourth friend likes → one bundled row: latest name + “and others liked your post”; no new push for the 4th.
3. Comments on the same post bundle separately from likes (different `type` key).
