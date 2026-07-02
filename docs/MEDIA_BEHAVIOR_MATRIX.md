# Native media behavior matrix — operational (VP-2 signoff)

**Date:** 2026-05-18  
**Scope:** **Current native behavior** — not MEDIA-1, not planned work.  
**Authority:** Code in `apps/mobile` vs `apps/web` (PWA).  
**Starting point:** [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md), [MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md).

---

## How to read this document

### Classification

| Tag | Meaning |
|-----|---------|
| **✅** | End-to-end behavior matches PWA intent; reliable enough to QA |
| **B** | Partially works — core path ok, gaps in refresh/UX/edge cases |
| **C** | Parity drift — works but semantically or visually different from PWA |
| **D** | Broken — crash, silent fail, or incorrect data |
| **A** | Intentionally deferred (named phase) |
| **F** | Blocked by later phase (REALTIME-1, MEDIA-1, P2O-C, etc.) |

### Truth status (three-way)

| Code | Meaning |
|------|---------|
| **CV** | Verified in source code this audit pass |
| **DU** | Not device-verified in this pass — treat as “works in code” only |
| **SD** | Known semantic drift vs PWA (documented) |
| **KN** | Known functional gap (not device-tested) |

### Works in code vs on device vs like PWA

| Level | Definition |
|-------|------------|
| **Works in code** | Implementation exists and typechecks; logic path present |
| **Works on device** | DU unless QA row marked **device-ok** |
| **Works like PWA** | Same user-visible semantics, not just same tables |

---

## Master matrix

| Subsystem | Native current behavior | Expected PWA behavior | Class | Primary source files | Truth |
|-----------|-------------------------|------------------------|-------|----------------------|-------|
| **Hub moments rail** | Fetches active non-share stories for self+friends; shows only users with ≥1 active moment; sorted by latest `created_at`; tap → viewer or composer (own, no stories) | Same filtering via `validGroupedStories` / `friendStoryGroups`; own slot always visible | **B** | `hub.tsx`, `fetchActiveMoments.ts`, `momentWindow.ts` | CV / DU |
| **Story rings (hub)** | Three-state: none / muted / glow from `story_views` + active moments; optimistic mute via `subscribeStoryViewed` | `friendStoryHasUnseen` + `StoryRing active`; PWA shows muted ring when no story on some surfaces — native uses **plain avatar** when none (device-verified product rule) | **B** | `storyRingState.ts`, `StoryRing.tsx`, `hub.tsx` | CV / SD |
| **Story rings (profile)** | `useStoryRingState` + `storyEpoch` refresh; same three-state | `storyRingActive` on `/profile`; friend `/u` unseen logic | **B** | `useStoryRingState.ts`, `profile.tsx`, `PublicProfileScreen.tsx` | CV / DU |
| **Story viewer** | Fullscreen modal; progress timer; tap L/R prev/next; swipe-down close; `recordStoryView` for **non-share** only; owner delete; share branch shows like+comment | Same modal pattern; view tracking; delete dispatches `story-posted` | **B** | `StoryViewerModal.tsx`, `CreateComposerProvider.tsx` | CV / DU |
| **Story views (`story_views`)** | Upsert on view; `fetchViewedStoryIds` chunked read; in-session merge via `storyViewEvents` | `recordStoryView` + `STORY_VIEWED_EVENT` + DB read | **✅** | `storyViews.ts`, `storyViewEvents.ts` | CV — cross-session **DB** |
| **Moment posting** | Camera shutter → preview → upload; library path with crop | Same | **B** | `StoryComposerModal.tsx`, `uploadStoryMedia.ts` | CV / DU |
| **Share posting** | Same upload path with `is_share: true`, `expires_at: null` | Same insert semantics | **B** | `uploadStoryMedia.ts` | CV / DU |
| **Library picker** | Left rail button + `allowsEditing` crop | File input + library button | **B** | `StoryComposerModal.tsx` | CV / DU |
| **Camera functionality** | `expo-camera` full-bleed + shutter + flip (MEDIA-0.2A) | `getUserMedia` live preview | **B** | `StoryComposerModal.tsx`, `app.config.ts` | CV / DU — **rebuild required** |
| **Story expiry (~24h)** | Client filter `isMomentStillActive` (min DB expiry, created+24h); no background timer | Same `momentWindow`; hub RT/poll refreshes lists | **B** | `momentWindow.ts`, `fetchActiveMoments.ts` | CV / KN |
| **Archive (profile tab)** | Fetch expired moments + hidden shares; grid → `/moments/[id]?view=archive`; **no auto-refresh on post** | `ProfileStoriesGrid` mode `archive` | **B** | `fetchProfileArchive.ts`, `ProfileTabGrid.tsx` | CV / DU |
| **Hidden shares** | `/archive-hidden`; unhide/delete via `hubShareMutations` | `/archive/hidden` | **✅** | `archive-hidden.tsx`, `fetchHiddenShares.ts` | CV / DU |
| **Share feed (hub)** | Read `stories` share rows; hide `share_hidden`; refetch on `storyEpoch` | `loadHubFriendShares` + `story-posted` + postgres RT | **B** | `fetchHubFeedPreview.ts`, `useHubFeedPreview.ts`, `hub.tsx` | CV / DU |
| **Share detail page** | `/moments/[id]` → `MomentDetailScreen`; likes/comments for shares; archive view; block gates | `moments/[id]/page.tsx` | **B** | `MomentDetailScreen.tsx`, `fetchMomentDetail.ts` | CV / DU |
| **Likes** | Insert/delete `story_likes`; hub refetches stats per card after success; viewer updates local state | Same tables; PWA may emit notifications (native does not) | **B** | `hubShareMutations.ts`, `storyFeedInteractions.ts` | CV / F |
| **Comments** | Read/write `story_comments`; sheet on hub + detail + viewer (shares) | `ShareCommentsBottomSheet` | **B** | `ShareCommentsBottomSheet.tsx` | CV / DU |
| **Delete** | `stories` row delete (owner); viewer closes + `bumpStoryEpoch`; **no storage object delete** | Same DB delete; `story-posted` refresh | **B** | `hubShareMutations.ts`, `StoryViewerModal.tsx` | CV |
| **Hide/unhide** | `share_hidden` update; hub feed **optimistic remove** on hide after DB ok | Same flag; feed refresh via events/RT | **✅** | `hubShareMutations.ts`, `hub.tsx` | CV / DU |
| **Auto-refresh / revalidation** | **`storyEpoch` after post/delete/hide/restore** — hub rail, shares feed, profile grids, archive, rings. View: optimistic `storyViewEvents` only. **No postgres RT.** | `story-posted` + RT + profile interval | **B** | `CreateComposerProvider.tsx`, `ProfileTabGrid.tsx`, `hub.tsx`, `useHubFeedPreview.ts` | CV — MEDIA-0.2C |
| **Realtime subscriptions** | **None** on `stories` / `story_views` | Hub channel on `stories` INSERT/UPDATE/DELETE | **F** | — vs `hub/page.tsx` | CV |
| **Upload pipeline** | `fetch(uri)` → blob → `storage/stories` upload → `stories` insert; fallback without `media_url` | `File` upload + insert + `story-posted` | **B** | `uploadStoryMedia.ts` | CV / DU |
| **Storage cleanup on delete** | **Not implemented** — DB row only | **Not implemented** in web viewer delete (DB only) | **B** | `hubShareMutations.ts` | CV |
| **Cross-session persistence** | `story_views`, likes, comments, posts persist in Supabase; rings/views reload from DB on fetch | Same | **✅** | `storyViews.ts` | CV |
| **Navigation after post** | Composer closes → hub tab; moments rail refetches via `storyEpoch`; **shares feed may not show new post until remount** | Stay in flow; lists refresh via event | **C** | `CreateComposerProvider.tsx` | CV / KN |
| **Navigation after view** | Viewer close → `bumpStoryEpoch` → rings may mute; viewedIds optimistic | `STORY_VIEWED_EVENT` merge | **✅** | `hub.tsx`, `useStoryRingState.ts` | CV / DU |
| **Navigation after hide** | Card removed from hub list in-place | Feed updates | **✅** | `hub.tsx` | CV |
| **Navigation after delete** | Viewer closes; epoch bump; moment removed from rail on refetch | `story-posted` + list refresh | **B** | `StoryViewerModal.tsx` | CV |

---

## Subsystem detail

### 1. Hub moments rail

| Dimension | Detail |
|-----------|--------|
| **Native** | `fetchActiveMomentsByUserIds` → filter non-share, active, has media; friends with 0 active omitted; own always shown with `+` if none |
| **PWA** | `loadHubStories` + `validGroupedStories` / `friendStoryGroups` |
| **After post (moment)** | Rail refetches when `storyEpoch` increments — **works in code** |
| **After friend posts** | Refetch only on hub remount / `storyEpoch` / friend list change — **not live** |
| **After 24h expiry** | Row drops on **next fetch** (no timer); user may see stale cell until refetch |
| **Optimistic vs DB** | Rail list = **authoritative DB read**; ring glow = DB `story_views` + local merge on view |
| **QA** | **Safe** for active-only + open viewer |
| **Trust** | Do not trust instant friend-new-moment without pull-to-refresh equivalent (none exists) |

### 2. Story rings

| Dimension | Detail |
|-----------|--------|
| **Native** | `none` = no ring; `seen` = muted; `unseen` = glow |
| **PWA** | Always has ring chrome; muted vs glow (native **none** when no active = **SD**, intentional) |
| **After view** | `recordStoryView` → DB → `emitStoryViewed` → hub/profile rings mute in-session |
| **After post (own)** | New story id → unseen until viewed — **if** rail refetched |
| **Cross-session** | **DB authoritative** for viewed set |
| **QA** | **Safe** for glow/mute after view in same session |
| **MEDIA-1** | N/A — semantics done |

### 3. Story viewer

| Dimension | Detail |
|-----------|--------|
| **Native** | Moments only in rail groups (`is_share: false` in fetch); viewer can show like UI but moments are non-share in practice |
| **PWA** | Hub groups exclude shares; viewer for moments |
| **Progress / advance** | ~50ms tick to 100% then next — **CV** |
| **Cross-user queue** | **Not implemented** (PWA also per-user group only) |
| **QA** | **Safe** open/close/advance/view record |
| **Don't trust** | Like counts on moments in viewer (edge UI present — **SD**) |

### 4. Story views

| Dimension | Detail |
|-----------|--------|
| **Write** | On viewer open per active story (`!is_share`) |
| **Read** | On hub mount / epoch; profile `useStoryRingState` |
| **Optimistic** | Local `viewedIds` updated **after** successful upsert (via event) |
| **QA** | **Safe** — verify ring mutes after watching |

### 5. Moment posting

| Dimension | Detail |
|-----------|--------|
| **Path** | Create sheet → **Choose photo** → library → preview → **Your story** |
| **PWA path** | Create sheet → **Camera** → live/crop → post |
| **DB** | `stories`: `is_share: false`, `expires_at` ≈ now+24h, `image_url`/`media_url` |
| **After success** | `bumpStoryEpoch` — rail + profile ring refresh |
| **Shares feed** | **Unaffected** (correct — moment not in share feed) |
| **QA** | **DU** — MEDIA-0.1 device pass after rebuild |
| **MEDIA-1** | Camera, crop, filters |

### 6. Share posting

| Dimension | Detail |
|-----------|--------|
| **DB** | `is_share: true`, `share_visible: true`, `share_hidden: false`, `expires_at: null` |
| **After success** | `bumpStoryEpoch` — **does not** call `useHubFeedPreview` refetch |
| **Expected PWA** | `story-posted` → `loadHubFriendShares` |
| **Classification** | **C** — user may not see own share on hub until leaving tab / reload app |
| **Workaround QA** | Switch tabs and return to hub, or kill/reopen |
| **Fix (post VP-2)** | Add `storyEpoch` to `useHubFeedPreview` deps — **not in this audit** |

### 7. Library picker

| Dimension | Detail |
|-----------|--------|
| **Native** | Library only; permission alert; picker error alert |
| **PWA** | Library + camera |
| **QA** | **DU** after native rebuild — deny permission, pick, cancel |
| **Don't trust until** | Device confirms no crash |

### 8. Camera

| Dimension | Detail |
|-----------|--------|
| **Native** | None |
| **PWA** | `StoryCameraModal` `getUserMedia` |
| **Class** | **A** (MEDIA-1) |

### 9. Story expiry (24h)

| Dimension | Detail |
|-----------|--------|
| **Rule** | `min(expires_at, created_at + 24h) > now` |
| **Native when expired** | Dropped from active fetches; rail cell gone on next fetch; profile ring → `none`; appears in **Archive** tab |
| **PWA when expired** | Same filter; archive grid; hub RT may remove sooner |
| **Auto without user action** | **Neither** runs expiry timer on hub — stale until refetch |
| **QA** | Cannot easily QA 24h wait — trust `momentWindow` parity **CV** |

### 10. Archive

| Dimension | Detail |
|-----------|--------|
| **Native** | Owner archive tab; expired moments + hidden shares in grid |
| **Refresh** | Tab select / first open only — **not** on `storyEpoch` |
| **After hide share** | Appears in archive on **next archive tab load** |
| **QA** | **Safe** read archive; **KN** refresh after hide without revisiting tab |

### 11. Hidden shares

| Dimension | Detail |
|-----------|--------|
| **Native** | Full CRUD read + unhide + delete |
| **QA** | **Safe** |

### 12. Share feed

| Dimension | Detail |
|-----------|--------|
| **Read** | ✅ from DB |
| **After share post** | **KN gap** — no epoch refetch |
| **After hide** | ✅ optimistic remove |
| **QA** | **Safe** read, like, comment, hide; **don't trust** immediate appear after post |

### 13. Share detail (`/moments/[id]`)

| Dimension | Detail |
|-----------|--------|
| **Native** | Full share interactions; archive query param |
| **QA** | **Safe** for shares |

### 14. Likes

| Dimension | Detail |
|-----------|--------|
| **DB** | Authoritative |
| **UI** | Hub: refetch card stats after toggle; Viewer: local count |
| **Notifications** | PWA may `createNotification` — native **F** |
| **QA** | **Safe** toggle; verify count updates |

### 15. Comments

| Dimension | Detail |
|-----------|--------|
| **DB** | Authoritative insert/delete |
| **Hub** | `onCommentsChanged` adjusts comment count on card — **optimistic delta** after send |
| **QA** | **Safe** |

### 16. Delete

| Dimension | Detail |
|-----------|--------|
| **Scope** | Owner only; `stories` delete |
| **Storage file** | Remains in bucket (orphan) — same as PWA |
| **After delete in viewer** | `onStoryDeleted` + `bumpStoryEpoch` |
| **QA** | **Safe** |

### 17. Hide / unhide

| Dimension | Detail |
|-----------|--------|
| **Hide** | DB + remove from hub feed optimistically |
| **Unhide** | `/archive-hidden` only — not from archive grid inline (check PWA) |
| **QA** | **Safe** hide from hub |

### 18. Auto-refresh summary

| Trigger | Moments rail | Hub shares | Profile shares | Profile rings | Archive grid |
|---------|--------------|------------|----------------|---------------|--------------|
| Post moment | ✅ epoch | — | — | ✅ epoch | — |
| Post share | — | ✅ epoch | ✅ epoch | — | — |
| Close viewer | — | — | — | Optimistic | — |
| View story | Optimistic | — | — | Optimistic | — |
| Hide share | — | ✅ optimistic + epoch | ✅ epoch | — | ✅ epoch |
| Delete | ✅ epoch | ✅ epoch | ✅ epoch | ✅ epoch | ✅ epoch |
| Friend posts | ❌ | ❌ | ❌ | ❌ |
| 24h expiry | ❌ timer | ❌ | ❌ | ❌ |
| PWA postgres RT | **F** | **F** | **F** | **F** |

### 19. Realtime

| Native | **No** `supabase.channel` on `stories` |
| PWA | Hub `postgres_changes` on `stories` |
| Phase | **F** (post–VP-2 or REALTIME slice) |

### 20. Upload pipeline

| Step | Behavior |
|------|----------|
| Pick | Local URI |
| Read | `fetch(localUri).blob()` |
| Upload | `storage.from("stories").upload` |
| Insert | `stories` row |
| Failure | Alert with message — no crash (MEDIA-0.1) |
| **QA** | **DU** end-to-end post |

### 21. Cross-session

| Data | Persists? |
|------|-----------|
| `story_views` | ✅ Supabase |
| Posts | ✅ |
| Likes / comments | ✅ |
| Ring local state | ❌ rebuilt from DB on launch |

---

## Optimistic vs authoritative (summary)

| UI surface | Optimistic | Authoritative read |
|------------|------------|-------------------|
| Viewed ring mute | ✅ after DB upsert + event | Initial: `fetchViewedStoryIds` |
| Hub hide share | ✅ remove card after DB | Feed load |
| Hub like count | ❌ refetch stats after DB | `fetchHubShareFeedCardStates` |
| Viewer like heart | ✅ local after DB | Initial fetch in viewer |
| Comment count on card | ✅ delta on send | Previews from DB |
| Moments rail list | ❌ | `fetchActiveMomentsByUserIds` |
| Share feed list | ❌ | `fetchHubFeedPreview` |

---

## QA readiness (production audit)

### Safe to QA now (expected reliable)

- Hub moments rail: active-only, open viewer, own composer when empty
- Story rings: none / seen / unseen after view (same session)
- Story viewer: open, advance, close, view persistence
- Share feed: **read**, like, comment, open detail
- Share detail page
- Hide share from hub (owner)
- Hidden shares archive
- Profile shares grid read
- Profile archive grid read (refresh tab to update)
- Delete moment/share in viewer (owner)

### Do NOT trust yet

- **Library picker** until MEDIA-0.1 device pass on **rebuilt** dev client
- **New share appears on hub feed immediately after post** (known gap)
- **Friend/new content appears without manual hub revisit**
- **Live camera** (does not exist)
- **Expiry-driven UI updates without navigation** (no timer)
- **Push notifications** on likes (not implemented)
- **Public profile** full parity (partial grids)

### Requires MEDIA-1

- Live camera + shutter + flip
- Crop stage parity (`react-easy-crop` equivalent)
- Filter pipeline
- PWA “Camera — *” sheet CTA parity (optional if keeping honest “Choose photo”)
- `/shares/new` dedicated full-page capture
- Profile avatar upload

### Blocked by realtime / other phases

| Behavior | Blocker |
|----------|---------|
| Hub live update when friend posts | **F** — stories postgres RT |
| Hub live update on share/moment insert | **F** |
| Chat send / thread realtime | REALTIME-1 |
| Active friends on hub | P2O-C presence |
| Like → notification to author | Notifications slice |
| Map / venue on moment | Optional future |

### P2O-B before media stabilized?

**P2O-B (GPS)** does not directly break story semantics, but:

- **Risk:** Team confuses “location phase” with “media phase” and skips **share-feed epoch refetch** + device MEDIA-0.1 signoff.
- **Risk:** QA bandwidth moves to map before hub **share post refresh** gap is documented/accepted.
- **Recommendation:** Accept **KN-01** (share feed refresh) as known VP-2 limitation **or** fix one-line `storyEpoch` on `useHubFeedPreview` before P2O-B. **Do not** block P2O-B on MEDIA-1 camera.

---

## Known gaps register (KN)

| ID | Gap | Class | VP-2 action |
|----|-----|-------|-------------|
| KN-01 | ~~Hub shares feed not refetching on `storyEpoch`~~ | **✅** | Fixed MEDIA-0.2A |
| KN-02 | No expiry/timer-driven refetch | **B** | Accept for VP-2 |
| KN-03 | No stories realtime | **F** | Post–VP-2 |
| KN-04 | Archive tab not refetch on post/hide | **B** | Revisit tab |
| KN-05 | Storage orphans on delete | **B** | Same as PWA |
| KN-06 | Viewer like UI on moments | **C** | Low priority |

---

## Related docs

- [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md)
- [MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md)
- [VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md)
- [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md)
