# MEDIA-0.2C — Post-refresh local invalidation audit

**Date:** 2026-05-18  
**Scope:** Local `storyEpoch` / `story-posted` parity — **no** realtime, polling, or caches.

---

## PWA mechanism (source of truth)

| Event | Dispatched from | Listeners refresh |
|-------|-----------------|-------------------|
| `story-posted` | `StoryCameraModal` post, `StoryViewerModal` delete, hub hide/delete, `moments/[id]` hide/delete, `/archive/hidden` delete, `/shares/new` post | Hub `loadHubStories` + `loadHubFriendShares`; profile `loadCountsAndPlaces`; `ProfileStoriesGrid` reload; hidden archive delete |

**Not dispatched:** viewer close (view uses `STORY_VIEWED_EVENT` optimistic merge).

**Also on PWA (out of native scope):** hub/profile `postgres_changes` on `stories`, profile 120s interval.

---

## Native mechanism (MEDIA-0.2C)

| Mechanism | Role |
|-----------|------|
| `bumpStoryEpoch()` | Increments `storyEpoch` + `emitStoryPosted()` |
| `storyEpoch` in hook deps | Triggers authoritative DB re-read for that surface |
| Optimistic UI | Hub hide/delete list patch **then** bump (PWA: list patch + event) |
| `subscribeStoryViewed` | Viewed rings only — **not** post refresh |

---

## Surface coverage matrix

| Surface | After post | After delete | After hide | After unhide (archive) |
|---------|------------|--------------|------------|------------------------|
| Hub moments rail | ✅ `storyEpoch` | ✅ | — | — |
| Hub shares feed | ✅ `storyEpoch` | ✅ bump | ✅ bump | — |
| Profile ring | ✅ `useStoryRingState` | ✅ | — | — |
| Profile shares grid | ✅ `ProfileTabGrid` | ✅ | ✅ | ✅ |
| Profile archive grid | ✅ | ✅ | ✅ (hidden share) | ✅ |
| Hidden shares page | ✅ `storyEpoch` | ✅ bump | — | ✅ bump |
| Story viewer groups | ✅ rail refetch | ✅ `onStoryDeleted` | — | — |
| Friend profiles | ❌ (correct) | ❌ | ❌ | ❌ |

---

## Changes shipped

| File | Change |
|------|--------|
| `storyPostEvents.ts` | PWA `story-posted` mirror |
| `CreateComposerProvider.tsx` | emit on bump; **removed** bump on viewer close (view ≠ post) |
| `ProfileTabGrid.tsx` | Refetch shares + archive on `storyEpoch` (not tab-gated) |
| `hub.tsx` | `bumpStoryEpoch` after owner hide/delete |
| `archive-hidden.tsx` | `storyEpoch` reload + bump after restore/delete |
| `MomentDetailScreen.tsx` | `bumpStoryEpoch` after hide/delete |

---

## Canonical semantics preserved

- Active-only hub rail (`fetchActiveMomentsByUserIds`)
- 24h expiry filters unchanged
- Viewed/unviewed via `story_views` + optimistic events
- No friend activity fabrication
- No postgres subscriptions

---

## QA checklist

1. Post **moment** → hub rail shows you immediately; profile ring glows.
2. Post **share** → hub feed + profile Shares grid update without tab switch.
3. Hide share from hub → removed from feed; appears in Profile Archive after opening Archive tab (prefetched on epoch).
4. Delete from hub / detail / viewer → removed everywhere relevant.
5. Restore from Hidden shares → share reappears on profile grid and hub feed (if visible).
