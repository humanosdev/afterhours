# App-wide interaction & perceived-performance audit

**Date:** 2026-05-18  
**Scope:** `apps/mobile` — production feel hardening before presence/realtime phases  
**Phase:** PERCEIVED PERFORMANCE STANDARDIZATION (audit + backlog; not feature work)  
**PWA:** Behavioral source of truth; native may exceed smoothness while preserving semantics  

**Related:** [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md), first interaction-stability pass (hub `AsyncSection`, viewer queue, `ProfileAvatar` / `StoryMediaImage` polish)

---

## Executive summary

The first interaction-stability pass improved **hub (partial), story viewer, comments sheet, chat thread gate, and primary avatars/media**. The app still reads as **“several polished surfaces”** because:

1. **Loading UX is split into two tiers** — flagship tabs use skeletons + fade; most stack/list screens use centered spinners or brief `return null` blanks.
2. **Image stack is split** — `expo-image` for avatars + story media; React Native `Image` for tab bar, all venue surfaces, composer preview.
3. **No list virtualization anywhere** — every feed is `ScrollView` + `.map()`; hub shares (up to 200) and long chat threads mount fully.
4. **Motion tokens are implicit** — 180 / 200 / 220 / 280 / 300 ms values scattered; `GlassBottomSheet` skips exit animation when parents set `visible={false}`.
5. **Viewer ring queue works in logic** but **hub rail does not scroll-follow**; cross-user transitions are modal fade, not spatial continuity.

This document inventories **every surface**, names **remaining seams**, and provides a **severity-ranked fix backlog**. It does not change roadmap, architecture, or presence/map phases.

---

## Target standard (cohesive “one OS”)

### Loading philosophy (apply everywhere)

| Rule | Intent |
|------|--------|
| **Skeleton first** | Layout-shaped placeholder within one frame of navigation; never an empty chrome + spinner alone. |
| **Preserve prior frame** | Where data was shown before (tab revisit, sheet close), keep stale content dimmed until refresh completes — no flash to empty. |
| **Soft hydrate** | `FadeInView` / `AsyncSection` (220ms default) when transitioning skeleton → content. |
| **No dead zones** | No `return null` on routes except redirect stubs (&lt;1 frame); gate redirects show skeleton, not blank. |
| **No layout jump** | Reserve height for media rows, grids, and headers; skeleton dimensions match final layout. |
| **Spinners only for actions** | Submit buttons, pull-to-refresh affordances, camera upload — not whole-screen data fetch. |

**Primitives to standardize on:**

- `ui/Skeleton` (+ `SkeletonCircle`, `SkeletonLine`, `SkeletonGrid`, future `SkeletonRow`)
- `ui/AsyncSection` + `ui/FadeInView`
- `skeletons/*` screen layouts (hub, chat, profile, discovery, moment detail, venue)
- `AppLoadingScreen` — **session gates only** (root, auth layout, app layout)

### Image hydration (apply everywhere)

| Property | Target |
|----------|--------|
| **Engine** | `expo-image` for all remote HTTP(S) user/venue/story URLs |
| **Cache** | `cachePolicy="memory-disk"` |
| **Transition** | **200ms** cross-fade (single constant; avatars may stay 180ms if documented) |
| **Placeholder** | Dark `#141820` under remote media; gradient + icon under avatars (never empty circle swap) |
| **Holdover** | Keep last good URI while next resolves (`StoryMediaImage` pattern) |
| **Prefetch** | Hub rail avatars + next viewer slide; extend to list rows entering viewport |
| **Signing** | `resolveStoryDisplayUri` for `stories` bucket; audit venue/avatar buckets separately |

**Exceptions (OK):** bundled assets (`require()`), local `file://` composer preview (RN `Image` acceptable).

### Motion tokens (proposed — centralize in `theme/motion.ts`)

| Token | Value | Use |
|-------|-------|-----|
| `fade.content` | 220ms | Section hydrate (`FadeInView`) |
| `fade.image` | 200ms | Remote images |
| `fade.avatar` | 180ms | Avatars (optional unify to 200) |
| `sheet.open` | backdrop 280ms, sheet 300ms | `GlassBottomSheet` |
| `sheet.close` | backdrop 220ms, sheet 260ms | `GlassBottomSheet` dismiss path |
| `modal.fade` | ~300ms (RN default) | Fullscreen viewer, menus |
| `modal.slide` | system | Composer camera |
| `skeleton.pulse` | 900ms loop | `Skeleton` opacity |
| `story.progressTick` | 50ms | Viewer timer (isolated to progress component ✓) |

**Easing:** default RN `ease` for fades; sheet snap-back `spring` bounciness 0 (keep).

### List / render standard

| Rule | Intent |
|------|--------|
| **Virtualize** when N &gt; ~15 or row contains images | `FlatList` / FlashList |
| **Stable keys** | Entity ids, never array index alone |
| **Memo rows** | `React.memo` + stable handlers (`useCallback` per id or context) |
| **Decouple hot state** | Like counts / viewed rings should not rerender entire feed |

---

## 1. App-wide loading audit (by surface)

**Legend — pattern:** `SK` skeleton · `SP` spinner · `BR` branded (`AppLoadingScreen`) · `BL` blank (`return null`) · `FD` fade (`AsyncSection`) · `PH` placeholder blocks · `NONE` static · `INLINE` text/hint only  

**Legend — issue tags:** `blank-flash` · `spinner-only` · `no-load-ui` · `partial-skeleton` · `layout-jump` · `late-avatar` · `late-media` · `rerender-heavy` · `abrupt-close` · `stale-frame` · `dead-zone`

### Primary tabs

| Surface | Route / file | Pattern | Issues |
|---------|----------------|---------|--------|
| **Hub** | `(tabs)/hub.tsx` | `FD`+`SK` moments, places, shares | `partial-skeleton` active friends (static empty, `HubActiveFriendsSkeleton` unused); `late-avatar` own ring opacity dim not SK; chrome loads before sections |
| **Map** | `(tabs)/map.tsx` | `NONE` | **`no-load-ui`** venues/friends hydrate silently; pins/sheet pop in; no SK for filter tray / sheet hero |
| **Create** | `(tabs)/create.tsx` | `BL` | Redirect-only; brief `blank-flash` before composer |
| **Chat list** | `(tabs)/chat.tsx` | `SK` | Header visible during load (OK); rows not memoized |
| **Profile** | `(tabs)/profile.tsx` | `SK` header + grid | **`partial-skeleton`** Edit/Share/tabs visible under header SK; tab switch refetches grid with SK flash |

### Stack screens

| Surface | Route / file | Pattern | Issues |
|---------|----------------|---------|--------|
| **Chat thread** | `chat/[id].tsx` | `SK` | `gateError` shows SK then redirect (OK post-fix); all messages mounted — `rerender-heavy` |
| **Discovery** | `search-discovery.tsx` → `DiscoverySearchScreen.tsx` | `SK` explore + inline people SK | Nested horizontal scroll in vertical scroll; search debounce SK OK |
| **Moment detail** | `moments/[id].tsx` → `MomentDetailScreen.tsx` | `SK` | Inline comments + sheet duplicate fetch; `rerender-heavy` on comment send |
| **Public profile** | `u/[username].tsx` → `PublicProfileScreen.tsx` | `SK` header; `SP` on CTA | `BL` if username missing; shares grid no separate SK (same `load()`); Places tab static empty |
| **Friends** | `friends.tsx` | `SP` + text | **`spinner-only`** vs chat/hub tier |
| **Notifications** | `notifications.tsx` | `SP` ×2 | **`spinner-only`**; no activity row SK; activity section placeholder only |
| **Blocks** | `blocks.tsx` | `BL` gate → `SP` | **`blank-flash`** owner gate; **`spinner-only`** |
| **Profile edit** | `profile-edit.tsx` | `SP` | **`spinner-only`**; form appears abruptly |
| **Archive hidden** | `archive-hidden.tsx` | `SP` | **`spinner-only`**; grid should use `SkeletonGrid` |
| **Live places** | `live-places.tsx` → `LivePlacesScreen.tsx` | `SP` | **`spinner-only`**; full venue list in scroll |
| **Venue activity** | `venue-activity.tsx` → `VenueActivityScreen.tsx` | `SK` | Hero uses RN `Image` — `late-media` |
| **Venue detail** | `venue-detail.tsx` | alias | same |
| **Settings** | `settings/index.tsx` | `NONE` | Static (OK) |
| **Notif. settings** | `settings/notifications.tsx` | `PH` gray rows | Not using `Skeleton` component; acceptable but inconsistent |
| **Shares redirect** | `shares/new.tsx` | `BL` | Composer redirect flash |

### Modals, sheets, viewers, overlays

| Surface | File | Pattern | Issues |
|---------|------|---------|--------|
| **App session gate** | `(app)/_layout.tsx`, `index.tsx`, `(auth)/_layout.tsx` | `BR` | Correct tier |
| **Create composer sheet** | `CreateComposerSheet.tsx` | `NONE` | Instant; OK |
| **Story composer** | `StoryComposerModal.tsx` | `INLINE` + `SP` on post/pick | Camera `starting` = black; no SK; RN preview `Image` |
| **Story viewer** | `StoryViewerModal.tsx` | media `PH` `#141820` | No full-screen SK; **`late-media`** first slide; cross-ring = fade not spatial; **no rail scroll-follow** |
| **Share comments** | `ShareCommentsBottomSheet.tsx` | `SK` rows | Hub vs viewer: viewer lacks `onCommentsChanged` delta; nested modal on viewer |
| **Glass bottom sheet** | `GlassBottomSheet.tsx` | animated open | **`abrupt-close`** when parent sets `visible=false` |
| **Overflow menus** | `HubShareFeedCard`, `MomentDetailScreen`, `ProfileMenuAnchor` | `fade` modal | Inconsistent with sheet motion |
| **Map venue sheet** | `MapVenueSheet.tsx` | `NONE` | Hero RN `Image`; opens without load affordance |
| **Tab bar** | `FloatingTabBar.tsx` | `BL` when hidden | OK; profile uses RN `Image` — `late-avatar` vs hub |
| **Parity placeholder** | `ParityPlaceholderScreen.tsx` | — | **Unwired** (no user impact) |

### Auth & onboarding

| Surface | File | Pattern | Issues |
|---------|------|---------|--------|
| **Landing** | `LandingScreen.tsx` | `NONE` | Reanimated marketing only (OK) |
| **Login / signup** | `login.tsx`, `signup.tsx` | `SP` submit | Form may flash before session redirect |
| **Forgot / reset** | `forgot-password.tsx`, `reset-password.tsx` | `SP` / `INLINE` | Reset: form visible before recovery ready |
| **Onboarding** | `onboarding.tsx`, `onboarding/username.tsx` | `INLINE` + `SP` | No field skeleton |
| **Auth redirect** | `AuthSessionRedirect.tsx` | `BR` | OK |

### Legal

| Surface | File | Pattern | Issues |
|---------|------|---------|--------|
| **Terms / privacy / guidelines** | `terms.tsx`, etc. → `LegalDocumentScreen` | `NONE` | Static copy (OK) |

---

## 2. Standardize loading philosophy — gap analysis

| Principle | Hub | Chat | Profile | Discovery | Lists stack | Map | Modals |
|-----------|-----|------|---------|-----------|-------------|-----|--------|
| Skeleton first | ✓ partial | ✓ | ✓ partial | ✓ | ✗ spinners | ✗ | ✗ / PH only |
| Fade hydrate | ✓ `AsyncSection` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Preserve prior frame | ✗ epoch refetch | ✗ | ✗ tab refetch | ✗ | ✗ | ✗ | ✗ |
| No blank routes | ✓ | ✓ | ✓ | ✓ | ✗ blocks/create | ✓ | ✗ composer redirect |
| No layout jump | △ shares cards | △ | △ grid | △ thumbs | △ | △ pins | △ sheet |

**`AsyncSection` adoption:** only `hub.tsx` today. **Required expansion:** friends, notifications, blocks, archive-hidden, live-places, profile-edit, public profile body, map venue sheet, chat list (already SK — add fade).

---

## 3. App-wide image hydration audit

### Current matrix

| Asset type | Component / location | Engine | Cache | Transition | Placeholder | Prefetch |
|------------|---------------------|--------|-------|------------|-------------|----------|
| Avatars (feed, viewer, chat, comments) | `ProfileAvatar` | expo-image | memory-disk | 180ms | gradient under | hub friends |
| Tab bar avatar | `TabBarProfileAvatar` | **RN Image** | none | none | flat gray | expo prefetch **not shared** |
| Story / share / moment / grid | `StoryMediaImage` | expo-image | memory-disk | 200ms | `#141820` + holdover | viewer + hub top shares |
| Venue chip (hub) | `VenueChipPlaceholder` | **RN Image** | none | none | initials tile | none |
| Venue discovery thumb | `VenueDiscoveryThumb` | **RN Image** | none | none | light gray | none |
| Venue sheet / detail hero | `MapVenueSheet`, `VenueActivityScreen` | **RN Image** | none | none | varies | none |
| Composer preview | `StoryComposerModal` | **RN Image** | N/A | none | black | N/A |
| Bundled brand | `HubTopChrome`, lockups | RN `require` | N/A | N/A | N/A | N/A |
| Map friends strip | `MapSecondaryControls` | `ProfileAvatar` | ✓ | ✓ | ✓ | none |

### Remaining hydration issues

| ID | Issue | Severity | Surfaces affected |
|----|-------|----------|-------------------|
| IMG-01 | Tab bar avatar separate cache/engine from `ProfileAvatar` | **P1** | Every tab switch |
| IMG-02 | All venue imagery on RN `Image` — pop-in, no fade | **P1** | Map, hub places, discovery, live places, venue detail |
| IMG-03 | `ProfileAvatar` no URI holdover on remount (unlike `StoryMediaImage`) | **P2** | Feed scroll away/back, list remount |
| IMG-04 | Inconsistent placeholder colors (`#141820` vs `rgba(255,255,255,0.06)` vs blue tint) | **P2** | Global |
| IMG-05 | `blocks.tsx` pre-resolves URI then passes to `ProfileAvatar` (double resolve) | **P3** | Blocks only |
| IMG-06 | No shared `MediaImage` primitive wrapping signing + expo-image | **P2** | Engineering consistency |
| IMG-07 | Story viewer first slide still waits on async sign — dark PH only | **P1** | Viewer open latency |

**Recommended primitive:** `RemoteImage` in `components/media/` — props: `uri`, `contentFit`, `aspect`, `label`, optional `resolveUri` hook; used by venues, banners, and future chat attachments.

---

## 4. State continuity audit

| Flow | Current behavior | Issue | Severity |
|------|------------------|-------|----------|
| Close comments sheet (hub) | `refreshShareStats` on close | Full network refetch for one story; feed may flicker | P2 |
| Close comments (viewer) | Clears `commentsStoryId` only | Stats not updated (OK for moments); sheet nested in viewer modal | P2 |
| `storyEpoch` bump | Refetches moments, shares, profile grids | **Intentional** but resets rings/grids — hub scroll offset usually preserved (ScrollView mounted) | P2 |
| Tab switch hub → profile → hub | Tabs stay mounted (Expo tabs) | Generally OK; share stats may refetch on focus if hooks added later | P3 |
| Open viewer from hub | Queue + preload | Rail **does not** scroll to active ring; closing does not animate rail position | **P1** |
| Open profile from feed card | `router.push` | Hub scroll state preserved (stack) | OK |
| Moment detail → back | `bumpStoryEpoch` on delete/hide | Grid refetch SK flash | P2 |
| Open composer from create tab | `replace` + modal | Create tab `null` flash | P2 |
| Chat invalid thread | SK → `replace` chat | Double load feel | P3 |
| Public profile load | Single `load()` | Header SK then full body appears — no staged grid SK | P2 |
| Viewer cross-ring advance | `groupIndex` state change + modal fade | **Perceptual reset** between users (no horizontal slide / rail sync) | **P1** |

**Continuity goals (no new features):** stale-while-revalidate for share stats; optional `storyEpoch` scoped invalidation; hub `ScrollView` ref + `scrollTo` on viewer open/close; avoid refetch-on-close comments when optimistic delta exists.

---

## 5. List virtualization & rerender audit

**Global:** **Zero** `FlatList` / `FlashList` / `SectionList` in `apps/mobile`.

| List surface | File | Est. max items | Virtualized | Row memo | Stable keys | Rerender risk |
|--------------|------|----------------|-------------|----------|-------------|---------------|
| Hub shares | `hub.tsx` | **200** (`STORY_LIMIT`) | No | `HubShareFeedCard` memo | `s.id` | **HIGH** — inline handlers, default stats object, `shareStatsById` patches |
| Hub moments rail | `hub.tsx` | ~friends | No | No | `f.id` | Medium |
| Hub places rail | `hub.tsx` | ~venues preview | No | No | `v.id` | Low |
| Chat threads | `chat.tsx` | threads | No | No | `chatId` | Medium — inline `onPress` |
| Chat messages | `ChatThreadShell.tsx` | unbounded | No | No | `m.id` | **HIGH** — full transcript on `activeMessageId` |
| Comments sheet | `ShareCommentsBottomSheet.tsx` | unbounded | No | No | `c.id` | Medium |
| Moment detail comments | `MomentDetailScreen.tsx` | unbounded | No | No | `c.id` | Medium |
| Hub card comment previews | `HubShareFeedCard.tsx` | 4 | No | — | `c.id` | Low |
| Friends sections | `friends.tsx` | friends | No | No | `friend.id` | Medium — search filter |
| Discovery people/venues | `DiscoverySearchScreen.tsx` | search hits | No | No | `p.id`, `v.id` | Medium |
| Discovery recent | nested H-Scroll | recent | No | No | composite key | Low |
| Live places | `LivePlacesScreen.tsx` | full catalog | No | No | `v.id` | Medium |
| Profile / archive grids | `ProfileTabGrid.tsx`, `archive-hidden.tsx` | shares/archive | No | No | `s.id` / `row.id` | Medium — images |
| Notifications requests | `notifications.tsx` | small | No | No | `r.id` | Low |
| Blocks | `blocks.tsx` | small | No | No | `p.id` | Low |
| Map friends strip | `MapSecondaryControls.tsx` | friends | No | No | `id` | Low |
| Story viewer progress | `StoryViewerProgressBars.tsx` | ~stories/user | No | **memo** ✓ | `id` | Low (isolated) |

**`React.memo` in app:** `HubShareFeedCard`, `StoryViewerProgressBars`, `VenuesMapCanvas` only.

---

## 6. Motion consistency audit

| Mechanism | Location | Timing | Inconsistency |
|-----------|----------|--------|---------------|
| Content fade | `FadeInView` | 220ms | Hub only |
| Avatar fade | `ProfileAvatar` | 180ms | ≠ media 200ms |
| Media fade | `StoryMediaImage` | 200ms | — |
| Sheet open/close | `GlassBottomSheet` | 280/300 open; 220/260 dismiss | Parent `visible=false` **skips** close animation |
| Fullscreen modal | `StoryViewerModal` | `fade` | vs composer `slide` |
| Overflow menus | feed, profile, moment | `fade` | Different from sheet |
| Skeleton pulse | `Skeleton` | 900ms | OK |
| Story timer | viewer | 50ms tick | Isolated to progress bars ✓ |
| Landing | `LandingScreen`, `LandingFeatureRow` | Reanimated 380–5200ms | Marketing only |
| Press scale | hub card actions | 0.95 | Not standardized elsewhere |

**Missing:** `theme/motion.ts` re-exports; shared `useSheetDismiss` that always runs animated close before `onClose`.

---

## 7. Viewer completion polish — current vs target

### Implemented (first pass)

- [x] Multi-ring queue from hub (`buildHubViewerQueue` + `openStoryViewer` options)
- [x] Auto-advance to next friend after last slide in group
- [x] `firstUnseenStoryIndex` on hub / profile / public profile open
- [x] Preload next in-group + first slide of next group
- [x] Progress bars isolated (`StoryViewerProgressBars` memo)
- [x] Pause timer when comments or owner menu open
- [x] Modal opens without blocking on `canOpen` media gate

### Still missing (perceived continuity)

| ID | Gap | Severity | Notes |
|----|-----|----------|-------|
| VIEW-01 | **No hub rail `scrollTo` / highlight** for active ring during viewer | **P0** | User loses spatial context |
| VIEW-02 | Cross-user transition is **fullscreen fade**, not horizontal handoff | **P1** | IG/Snap feel needs slide or shared element |
| VIEW-03 | Close after final ring — modal dismiss only; rail does not scroll to “done” position | **P1** | |
| VIEW-04 | Swipe horizontal between users **not implemented** (tap advance only) | **P2** | Queue logic exists; gesture UX missing |
| VIEW-05 | Long-press pause **not implemented** | **P2** | Timer pauses for sheet/menu only |
| VIEW-06 | Video-length timing **N/A** (images only, fixed ~5s) | **P3** | Documented |
| VIEW-07 | Bad media: placeholder only; PWA closes viewer on error | **P2** | |
| VIEW-08 | Viewer comments: nested `Modal` + `GlassBottomSheet` | **P2** | z-order / Android back |
| VIEW-09 | `prevStory` at group 0 jumps to **previous user’s last slide** ✓ — but no visual continuity | **P1** | Logic OK, motion weak |
| VIEW-10 | Opening viewer while hub rail off-screen does not auto-scroll ring into view | **P0** | Same as VIEW-01 |

---

## 8. Prioritized severity backlog

### P0 — breaks “system-wide cohesion” on primary paths

| ID | Item | Surfaces | Suggested fix (no new features) |
|----|------|----------|-----------------------------------|
| P0-1 | Map tab silent load | `map.tsx` | Venue/friend SK overlay or shimmer on map chrome |
| P0-2 | Viewer rail scroll-follow | `hub.tsx`, `StoryViewerModal`, ref on moments `ScrollView` | `scrollTo` active ring on open/close/advance |
| P0-3 | Hub shares feed unvirtualized at 200 | `hub.tsx`, `HubShareFeedCard` | FlashList + stable callbacks |
| P0-4 | `return null` route blanks | `create.tsx`, `shares/new.tsx`, `blocks.tsx`, `u/[username].tsx` | Skeleton or redirect shell |

### P1 — frequent seams users notice

| ID | Item | Surfaces |
|----|------|----------|
| P1-1 | Spinner-only list screens | friends, notifications, blocks, archive, live-places, profile-edit |
| P1-2 | `TabBarProfileAvatar` → expo-image + shared cache | `FloatingTabBar.tsx` |
| P1-3 | Venue imagery → expo-image + unified placeholder | all venue components |
| P1-4 | `AsyncSection` rollout to stack lists | friends, notifications, archive, live-places |
| P1-5 | Hub share row prop stability | `hub.tsx` handlers, stats defaults |
| P1-6 | Viewer cross-ring motion | optional horizontal `Animated` on group change |
| P1-7 | `GlassBottomSheet` animated close on programmatic hide | `GlassBottomSheet.tsx` + callers |
| P1-8 | Profile tab partial skeleton | hide actions/tabs until header ready |
| P1-9 | First viewer slide sign latency | prefetch on ring press before modal open |

### P2 — polish & secondary surfaces

| ID | Item |
|----|------|
| P2-1 | Chat messages FlatList + memo bubbles |
| P2-2 | Chat thread list FlatList + memo `ChatThreadRow` |
| P2-3 | Discovery / live places virtualize long results |
| P2-4 | Profile / archive `SkeletonGrid` on archive-hidden (not spinner) |
| P2-5 | `ProfileAvatar` URI holdover |
| P2-6 | `theme/motion.ts` central tokens |
| P2-7 | Comments: unify hub/viewer `onCommentsChanged`; avoid refetch on close if delta applied |
| P2-8 | Moment detail: avoid duplicate comments UI fetch |
| P2-9 | Public profile staged grid skeleton |
| P2-10 | Map venue sheet hero load SK |
| P2-11 | ShareCommentsBottomSheet use `Skeleton` not custom rows (already SK — align component) |
| P2-12 | Hub active friends: wire skeleton or remove dead export |
| P2-13 | Viewer bad-media handling (skip slide or close) |

### P3 — scale / consistency / cleanup

| ID | Item |
|----|------|
| P3-1 | `RemoteImage` shared primitive |
| P3-2 | Remove unused `ProfileGridSkeleton` or wire it |
| P3-3 | Unify fade durations to 200ms |
| P3-4 | `blocks.tsx` stop double `resolveAvatarUri` |
| P3-5 | Notifications activity feed skeleton when built |
| P3-6 | Onboarding field skeletons |
| P3-7 | Long-press viewer pause |
| P3-8 | Horizontal swipe between rings |

---

## 9. What the first pass already fixed (baseline)

Do not regress these when executing the backlog:

- Hub moments / places / shares: `AsyncSection` + skeletons + fade
- Story viewer: ring queue, first-unseen, preload, progress isolation, timer pause on overlays
- `ProfileAvatar` + `StoryMediaImage`: expo-image, caching, transitions, holdover (media)
- Share comments sheet: skeleton rows (not spinner)
- Chat thread gate: skeleton during redirect
- `HubShareFeedCard`: `React.memo` (needs stable props to be effective)
- Hub avatar + share prefetch

---

## 10. Recommended execution waves (still no roadmap change)

| Wave | Focus | Unlocks |
|------|-------|---------|
| **A** | P0 blanks + map load UI + viewer rail scroll-follow | Primary tab cohesion |
| **B** | P1 spinner → skeleton + `AsyncSection` on all list stacks | System-wide loading tier |
| **C** | P1 image stack unification (tab bar + venues) + `theme/motion.ts` | Hydration + motion cohesion |
| **D** | P0/P1 hub FlashList + stable row props | Feed performance |
| **E** | P2 chat virtualize + comments continuity | Social surfaces |
| **F** | Viewer motion (horizontal handoff, close polish) | IG-level viewer feel |

---

## 11. Audit checklist (for QA signoff)

Use on **physical device** after each wave:

- [ ] No screen shows empty background + centered spinner for initial load (except button actions)
- [ ] No `return null` visible flash on navigation
- [ ] Avatars on hub, tab bar, chat, viewer show same photo without double pop-in
- [ ] Share/moment images fade in without layout jump
- [ ] Hub shares scroll smooth at 50+ cards
- [ ] Open viewer from off-screen ring → rail scrolls to ring
- [ ] Advance through last friend → closes smoothly; rail position sensible
- [ ] Open/close comments from hub and viewer — same sheet SK, no feed white flash
- [ ] Map venues appear with load affordance, not empty map then pop
- [ ] Sheet close always animates (comments, composer, delete confirm)

---

## 12. Files reference (quick index)

| Area | Key paths |
|------|-----------|
| Loading primitives | `src/components/ui/Skeleton.tsx`, `AsyncSection.tsx`, `FadeInView.tsx`, `AppLoadingScreen.tsx` |
| Screen skeletons | `src/components/skeletons/*` |
| Viewer | `src/components/stories/StoryViewerModal.tsx`, `StoryViewerProgressBars.tsx`, `src/lib/storyViewerNavigation.ts` |
| Composer provider | `src/providers/CreateComposerProvider.tsx` |
| Media | `src/components/media/StoryMediaImage.tsx`, `ProfileAvatar.tsx`, `TabBarProfileAvatar.tsx` |
| Sheets | `src/components/ui/GlassBottomSheet.tsx`, `shares/ShareCommentsBottomSheet.tsx` |
| Hub | `app/(app)/(tabs)/hub.tsx` |
| Lists | `friends.tsx`, `notifications.tsx`, `chat.tsx`, `ChatThreadShell.tsx`, `DiscoverySearchScreen.tsx` |

---

*End of audit. No architecture, presence, map intelligence, or feature roadmap changes implied.*
