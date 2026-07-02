# VP-2 Story ring / glow semantics audit

**Date:** 2026-05-17  
**Scope:** Hub, own profile, friend profile — **not** decorative; signals active moments + viewed state.

**Authority:** `apps/web` — `StoryRing`, `Avatar` (`ringActive`), `story_views`, `momentWindow`.

---

## Executive summary

| Surface | Driver | Native after (2026-05-17) |
|---------|--------|---------------------------|
| Hub — Your moment | `none` / `seen` / `unseen` + `+` when `none` | ✅ |
| Hub — Friend cell | Only if active; then `seen` / `unseen` | ✅ |
| Own profile | `none` / `seen` / `unseen` | ✅ |
| Friend `/u` | `none` / `seen` / `unseen` | ✅ |

**Persistence:** `story_views` table (per `viewer_id` + `story_id`), not session-only.

---

## PWA canonical rules

### Visual model — three states (product truth, device-verified)

| State | Active story? | Viewed? | UI |
|-------|---------------|---------|-----|
| **None** | No | — | **Plain avatar** — no ring, no grey halo |
| **Seen** | Yes | All active stories in `story_views` | Muted/grey gradient ring |
| **Unseen** | Yes | ≥1 active story not in `story_views` | Brand glow ring |

**Important:** “No story” and “viewed story” must **not** look the same. Native previously mapped both to muted ring — **semantic drift** (fixed 2026-05-17).

**Repo note:** `apps/web/src/components/ui/StoryRing.tsx` comment says ring is “always drawn” with muted when `active={false}`. Side-by-side device QA against deployed PWA shows **no ring** when there is no active moment on profile/hub own slot. Native implements the **three-state** model above; web component may still render a subtle muted shell in some builds — **behavioral truth is none / seen / unseen**.

Sources: `Avatar.tsx` (`storyRing={false}` = plain avatar), hub `hasMyActiveStory`, profile `hasLiveMoment`, `story_views`.

### Active moment (eligibility for rail / ring logic)

A row counts only if:

1. `is_share === false`
2. `media_url` / `image_url` present
3. `isMomentStillActive(created_at, expires_at)` — min(DB expiry, created+24h) > now

Source: `momentWindow.ts`, hub `hasActiveStoryMedia`, profile `liveMomentStories`.

**Archive / expired:** excluded from active sets; appear in profile **Archive** grid only.

### Viewed / unseen (glow emphasis)

| Rule | Detail |
|------|--------|
| Granularity | **Per-story** (`story_id`), not per-user |
| Store | `story_views` (`viewer_id`, `story_id`, `viewed_at`) |
| User-level glow | **Any** active story unseen → ring `active={true}` |
| Record view | `recordStoryView` on viewer open (non-share stories) |
| Optimistic UI | `STORY_VIEWED_EVENT` → merge into local state without full refetch |

Sources: `storyViews.ts`, hub L701–708, profile L262–269, `StoryViewerModal` view recording.

### Own vs friend semantics

| Context | Glow when |
|---------|-----------|
| Hub — Your moment | Active own stories exist **and** ≥1 not in `story_views` for self |
| Hub — Friend ring | Friend has active stories (in rail) **and** ≥1 unseen |
| `/profile` (own) | Same as hub own — `storyRingActive` L316–317 |
| `/u/[username]` friend | Active stories **and** ≥1 unseen for viewer |
| `/u/[username]` own | Active stories exist (glow even if self-viewed) — native redirects own → `/profile` |

### Re-glow after new upload

New `stories` row → new `story_id` → not in `story_views` → **glow** until opened in viewer.

PWA: `story-posted` event + hub postgres refresh. Native: `storyEpoch` bump after post/viewer close + moments refetch.

### Expiration (~24h)

When `isMomentStillActive` becomes false:

- **Hub:** user drops from rail (no cell).
- **Profile:** ring → muted (`seen`); no glow unless other active unseen stories remain.

### Ordering / refresh

| Trigger | PWA | Native |
|---------|-----|--------|
| Initial load | Fetch stories + `fetchViewedStoryIds` | ✅ |
| After view | `STORY_VIEWED_EVENT` | ✅ `emitStoryViewed` / `subscribeStoryViewed` |
| After post | `story-posted` + realtime (hub) | ✅ `bumpStoryEpoch` (no hub RT yet) |
| Poll | Profile/u: 15s interval | ⏸ deferred |

---

## Native drift (pre-fix)

| Bug | Cause |
|-----|--------|
| Grey ring with **no** active story | `profileStoryRingState` returned `"seen"` for empty actives |
| Own hub always glowing | `defaultOwnStoryRingState()` → `add-own` |
| Profile always muted | Hardcoded `ringState="seen"` |
| Friend profile always muted | No `story_views` read on `/u` |
| Viewed state lag | No event merge until refetch |

---

## Classification

### VP-2 fix now ✅

| Item | Shipped |
|------|---------|
| `storyRingState.ts` helpers | ✅ |
| `storyViewEvents.ts` + emit on `recordStoryView` | ✅ |
| Hub own + friend ring state | ✅ |
| Profile + public profile `useStoryRingState` | ✅ |
| Immediate mute-after-view (event bus) | ✅ |

### Requires canonical story-view parity (partially done)

| Item | Status |
|------|--------|
| `story_views` read | ✅ |
| `recordStoryView` in viewer | ✅ (non-share) |
| Optimistic merge | ✅ native event bus |
| Cross-device viewed sync | ✅ via DB (refetch on focus/epoch) |

### Deferred (not fake in VP-2)

| Item | Phase |
|------|-------|
| Hub `postgres_changes` story refresh | Post–VP-2 / REALTIME |
| 15s profile moment poll | PWA parity polish |
| New story upload pipeline | Media slice (`StoryComposerModal` post) |
| Cross-user viewer queue (swipe friend→friend) | **Not in PWA** |

### Honest simplified behavior (if views fail)

If `story_views` read fails: native falls back to **muted** (`seen`) — does **not** fake unseen glow.

---

## Device QA checklist (rings)

1. **No active story (any surface):** plain avatar — **no grey ring**.
2. **Active + all viewed:** muted ring only.
3. **Active + unseen:** glow ring.
4. **Hub — friend:** cell absent when no active story.
5. **Hub — Your moment:** `+` badge only when `none`; ring appears when active.
6. **After 24h expiry:** hub cell gone; profile → plain avatar (`none`).

---

## Related

- [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md) — rail roster + archive
- [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) — Stories & moments §
- [VP2_STABILIZATION_INVENTORY.md](./VP2_STABILIZATION_INVENTORY.md)
