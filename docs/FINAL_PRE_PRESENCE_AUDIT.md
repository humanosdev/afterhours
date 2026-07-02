# Final pre-presence audit — PWA vs native holistic parity

**Date:** 2026-05-18  
**Scope:** `apps/web` (production PWA) vs `apps/mobile` (native)  
**Purpose:** Absolute clarity on what must be **foundation-stable** before **`P2O-B` / `P2O-C` / `P2O-D`** (location, presence reads, presence writes, movement intelligence).  
**Authority:** PWA is behavioral + visual source of truth; native may exceed smoothness while preserving semantics ([MIGRATION_PHASES.md](./MIGRATION_PHASES.md), [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md)).

**Related audits:** [APP_WIDE_INTERACTION_AUDIT.md](./APP_WIDE_INTERACTION_AUDIT.md) · [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) · [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) · [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md)

**Immediate UX fix (this pass):** Hub share cards — removed fixed-height letterboxing; **4:5 aspect** + tighter action/timestamp rhythm ([`HubShareFeedCard.tsx`](../apps/mobile/src/components/shares/HubShareFeedCard.tsx)).

---

## Executive summary

### What is already foundation-stable (native)

| Area | Status |
|------|--------|
| **Media pipeline** | Posting, JPEG normalize, device upload, signed render — stable on physical iPhone |
| **Stories / shares** | Composer, hub feed, moment detail, profile grids, viewer queue |
| **Interaction (partial)** | Hub `AsyncSection`, viewer ring queue + preload, comments skeleton, chat gate skeleton |
| **Read-only social** | Friends roster, blocks list, chat history (read), hub/chat/profile discovery reads |
| **Map engine (`P2O-A`)** | Mapbox pins, category filters, checkpoint bar chrome, venue sheet shell, deep link |

### What is NOT ready (blocks “presence phases feel cohesive”)

| Area | Gap |
|------|-----|
| **Map product layer** | No heat, glow, district flow, presence markers, GPS puck, activity-sorted checkpoints, auto-tour — **by design until P2O-B/C** |
| **Map UX polish** | No loading affordance, placeholder sheet counts, locate ≠ GPS |
| **System-wide feel** | Tier-1 vs tier-2 loading; split image stack; no list virtualization |
| **VP-2 sign-off** | Visual identity pass not formally closed ([MIGRATION_PHASES.md](./MIGRATION_PHASES.md)) |

### Gate decision (read this first)

```text
┌─────────────────────────────────────────────────────────────────┐
│  START P2O-B (expo-location) ONLY AFTER:                        │
│    • VP-2 sign-off (device QA vs deployed PWA)                  │
│    • P0/P1 rows in §9 marked “Required before presence” = done  │
│    • System Truth Audit UNKs for location scope resolved/waived   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  START P2O-C (user_presence READ) ONLY AFTER:                   │
│    • P2O-B complete (GPS, distance, locate semantics)             │
│    • Map sheet wired to read presence (not hardcoded 0)           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  P2O-D / realtime / background / movement intelligence:         │
│    Explicit later gates — NOT part of this foundation audit.    │
└─────────────────────────────────────────────────────────────────┘
```

**Do not confuse:** Map **visual activity** (heat, glow, live friends) = **presence phase work**. Map **chrome polish + loading + honest copy** = **pre-presence foundation**.

---

## Severity legend

| Level | Meaning |
|-------|---------|
| **P0** | Broken, deceptive, or primary-path embarrassment — fix before any presence work |
| **P1** | Frequent user-visible seam on core tabs — fix before P2O-B |
| **P2** | Secondary screens or polish — fix in foundation hardening or early P2O-B |
| **P3** | Scale, nice-to-have, or explicitly deferred phase scope |

**Required before presence?**

| Tag | Meaning |
|-----|---------|
| **YES** | Must complete (or waive in writing) before **`P2O-B`** |
| **NO — P2O-B** | Belongs to location slice |
| **NO — P2O-C** | Belongs to presence read slice |
| **NO — P2O-D+** | Writes, realtime, background, movement |
| **DEFER** | Safe after presence phases; not blocking |

---

## 1. MAP PARITY (highest priority)

**PWA source of truth:** [`apps/web/src/app/map/page.tsx`](../apps/web/src/app/map/page.tsx) (~4k lines — layers, overlays, sheet, tour, presence).  
**Native:** [`apps/mobile/app/(app)/(tabs)/map.tsx`](../apps/mobile/app/(app)/(tabs)/map.tsx) + [`apps/mobile/src/components/map/*`](../apps/mobile/src/components/map/) + [`VenuesMapCanvas.tsx`](../apps/mobile/src/components/VenuesMapCanvas.tsx).

### 1.1 Feature comparison matrix

| Feature | PWA | Native | Severity | Required before presence? | Defer |
|---------|-----|--------|----------|---------------------------|-------|
| Mapbox basemap | light + **dark** (hourly) | **light only** | P2 | DEFER (VP-2D / atmosphere) | Night mode with P2O-C |
| Mapbox **fog** + brand tint | Yes | Vignette overlay only | P2 | DEFER | Full fog in atmosphere pass |
| **Heatmap** (`venue-heat`) | Yes, animated breathe | **Missing** | — | **NO — P2O-C** | Presence/activity layer |
| **Per-venue glow/core** | Yes, activity-stepped | Pin shadow only | — | **NO — P2O-C** | |
| **District flow trails** | Yes | **Missing** | — | **NO — P2O-C+** | |
| Category filter tray | Glass pills, 5 cats | `MapCategoryFilterTray` ✓ | P3 | — | Minor tint alignment |
| **Checkpoint bar** | Activity sort + distance + pulse | Geo/catalog order, static glow | P1 (sort) / P2 (pulse) | Sort: **NO — P2O-C**; loading: **YES** | Activity sort needs presence counts |
| **Auto-tour** | Idle 20s → 4s cycle | **Missing** | — | **NO — P2O-C+** | |
| **Venue sheet** | Live inside/nearby, friends, density | **Zeros + placeholder copy** | P1 | Copy honesty: **YES**; live data: **NO — P2O-C** | |
| **Friends on map** | Markers + sidebar + `easeTo` | List only, “Live location after map update” | — | **NO — P2O-C** | |
| **Your location** | GPS puck + watch | Locate = **camera refit to venues** | P1 | **NO — P2O-B** | |
| Distance to venue | Live | “Getting your distance…” stub | P1 | **NO — P2O-B** | |
| Ghost mode | Toggle write on map | Display only, no toggle | P2 | **NO — P2O-D** | Write path |
| Presence marker smooth | DOM lerp + pulse | N/A | — | **NO — P2O-C** | |
| Low-zoom cluster badges | Yes | No | — | **NO — P2O-C** | |
| Sheet dismiss | Drag + wheel + map tap | Tap above + close btn | P2 | DEFER | Gesture parity |
| Deep link `?venueId=` | Yes | Yes ✓ | — | — | |
| Venue CTA → activity | `/venue-activity?venueId&mapTone` | `/venue-activity?venueId` ✓ | P3 | — | |
| **Loading UX** | `MapPageSkeleton` | **None** | **P0** | **YES** | — |
| **Error UX** | Implicit in page | Silent (`useVenuesPreview` ignored) | **P1** | **YES** | — |
| Expo Go fallback | N/A | Dark grid, no explanation | **P1** | **YES** | Dev-build banner |
| Pin + label | GL layers + glyphs | `MarkerView` + `SymbolLayer` ✓ | P2 | DEFER | Performance tune |
| Overlay top inset | Tuned in page | `mapTopOverlayPaddingTop` ✓ | P3 | — | |
| Checkpoint bar position | Portaled bottom | `mapCheckpointBarBottom` ✓ | P3 | — | |
| Map/tab continuity | Tab switch | Tab hidden when sheet open ✓ | — | — | |
| **FPS / heat animation** | 200ms heat tick | N/A | — | **NO — P2O-C** | Profile with devices |

### 1.2 Map — visual & motion gaps

| Issue | PWA | Native | Fix | Required? |
|-------|-----|--------|-----|-----------|
| Pins feel flat without halos | Glow layers | Category pin + shadow | Port glow when P2O-C provides counts | NO — P2O-C |
| Basemap “alive city” | Night + fog + minimal clutter | Light + vignette | VP-2D atmosphere; night with presence phase | Partial YES (vignette OK for VP-2) |
| Checkpoint pulse on arrival | CSS + `checkpoint_pulse` property | Static accent | Wire pulse when presence events exist | NO — P2O-C |
| Sheet expansion | Rich scroll + drag | Fixed height sheet | Sheet snap points — P2 | DEFER |
| Label density | zoom ≥ 11.6 | SymbolLayer truncation | Tune minZoom | DEFER |

### 1.3 Map — placeholder / deceptive (fix before P2O-B)

| ID | Issue | Recommended fix |
|----|-------|-----------------|
| MAP-UX-01 | Sheet shows **0 inside / 0 nearby** as if real | Label as “—” or hide counts until P2O-C; keep “Quiet pin” only as copy |
| MAP-UX-02 | **No loading** while venues fetch | `MapPageSkeleton` or overlay shimmer on chrome |
| MAP-UX-03 | **Locate** implies GPS but refits catalog | Rename to “Fit venues” until P2O-B, or implement GPS in P2O-B |
| MAP-UX-04 | Expo Go **blank map** unexplained | Ribbon: “Map requires dev build + token” |
| MAP-UX-05 | Friends panel promises live location | Keep subtitle honest (already stubbed) ✓ |

---

## 2. HUB PARITY

**PWA:** [`apps/web/src/app/hub/page.tsx`](../apps/web/src/app/hub/page.tsx) + [`HubShareFeedCard.tsx`](../apps/web/src/components/HubShareFeedCard.tsx)  
**Native:** [`apps/mobile/app/(app)/(tabs)/hub.tsx`](../apps/mobile/app/(app)/(tabs)/hub.tsx)

| Issue | PWA | Native | Severity | Required before presence? | Fix |
|-------|-----|--------|----------|---------------------------|-----|
| Share card media height | `max-h` intrinsic | ~~Fixed `height` box~~ → **4:5 aspect** ✓ | — | YES (done) | — |
| Action/timestamp density | `mt-3` / `mt-2` | Tightened to 6/4px ✓ | — | YES (done) | — |
| Active friends | Live presence strip | Static “No friends live” | — | **NO — P2O-C** | Hub poll + realtime |
| Moments rail | Live rings + viewer | Rings ✓, queue ✓ | P2 | DEFER | Rail scroll-follow (VIEW-01) |
| Live places rail | Venue pulse | Read-only venues ✓ | P3 | — | |
| Shares feed | Full cards + realtime | Read + local epoch ✓ | P2 | DEFER | FlashList |
| Loading | Section skeletons | `AsyncSection` partial ✓ | P1 | YES | Expand tier-2 screens |
| Comments | Global sheet + delta | Hub ✓; viewer partial | P2 | DEFER | Unify `onCommentsChanged` |
| Search launcher | `/search` | `/search-discovery` ✓ | P2 | — | Networked search later |
| Pull-to-refresh | Web semantics | Not mirrored | P3 | DEFER | |
| Typography rhythm | Tuned in hub CSS | `hubLayout` tokens | P3 | DEFER | VP-2D |
| Avatar timing | Poll + realtime | Prefetch ✓ | P2 | DEFER | Tab bar cache split |
| `HubActiveFriendsSkeleton` | N/A | Unused import | P3 | YES | Wire or delete |

---

## 3. PROFILE PARITY

| Surface | PWA route | Native | Severity | Required before presence? |
|---------|-----------|--------|----------|---------------------------|
| Own profile | `/profile` | `(tabs)/profile.tsx` | P2 partial | YES — partial skeleton |
| Edit profile | `/profile/edit` | `profile-edit.tsx` | P1 spinner | YES — form skeleton |
| Friends | `/profile/friends` | `friends.tsx` | P1 spinner | YES — list skeleton |
| Blocks | `/profile/blocks` | `blocks.tsx` | P1 blank+spinner | YES |
| Public profile | `/u/[username]` | `PublicProfileScreen.tsx` | P2 | YES — grid SK |
| Archive hidden | `/archive/hidden` | `archive-hidden.tsx` | P1 spinner | YES — grid SK |
| Profile menu | Dropdown | `ProfileMenuAnchor` ✓ | P3 | — |
| Story ring on avatar | Yes | `useStoryRingState` ✓ | — | — |
| Shares/Archive grids | Real data | `ProfileTabGrid` ✓ | P2 | DEFER | Virtualize |
| Places tab | Content | Static empty | P3 | DEFER | Product |
| Counts | Live | Shares count ✓ | P3 | — |

---

## 4. NAVIGATION + FLOW

| Issue | PWA | Native | Severity | Required before presence? | Defer |
|-------|-----|--------|----------|---------------------------|-------|
| Tab switch continuity | SPA | Tabs stay mounted ✓ | — | — | |
| Back from stack | Browser | `router.back` ✓ | — | — | |
| Modal dismiss | Consistent | Sheet abrupt close | P2 | YES | Animated close path |
| Viewer → hub scroll | N/A | Not restored | P1 | YES | Rail `scrollTo` |
| Comments open/close | Feed stable | Hub refetch on close | P2 | DEFER | Optimistic only |
| `storyEpoch` refetch | Event-driven | Local bump ✓ | P2 | — | Scoped invalidation |
| Create tab flash | Overlay | `return null` | P1 | YES | Skeleton shell |
| Auth session redirect | Branded | `AppLoadingScreen` ✓ | — | — | |
| Map sheet hides tab bar | Yes | Yes ✓ | — | — | |
| Deep links | Various | Most wired ✓ | P3 | — | |

---

## 5. LOADING + MOTION

Consolidated from [APP_WIDE_INTERACTION_AUDIT.md](./APP_WIDE_INTERACTION_AUDIT.md).

### Remaining raw spinners (whole-screen data fetch)

| Screen | Required before presence? |
|--------|---------------------------|
| `friends.tsx` | **YES** |
| `notifications.tsx` | **YES** |
| `blocks.tsx` | **YES** |
| `archive-hidden.tsx` | **YES** |
| `profile-edit.tsx` | **YES** |
| `live-places.tsx` | **YES** |
| `map.tsx` | **YES** |

### Remaining blank flashes

| Screen | Required before presence? |
|--------|---------------------------|
| `(tabs)/create.tsx` | **YES** |
| `shares/new.tsx` | **YES** |
| `blocks.tsx` (owner gate) | **YES** |
| `u/[username].tsx` (bad param) | **YES** |

### Motion token drift

| Token | Values today | Required before presence? |
|-------|--------------|---------------------------|
| Image fade | 180 / 200ms | P2 — unify to 200ms |
| Content fade | 220ms | P2 |
| Sheet open/close | 280/300 / 220/260 | P2 — fix programmatic close |
| Viewer modal | fade | P2 — optional horizontal handoff DEFER |

---

## 6. PERFORMANCE

| Surface | Risk | Severity | Required before presence? |
|---------|------|----------|---------------------------|
| Hub shares (200 mount) | Memory + scroll jank | **P1** | **YES** — FlashList or cap |
| Chat thread (all messages) | Long thread jank | **P1** | **YES** |
| Hub `HubShareFeedCard` memo | Defeated by inline props | **P1** | **YES** |
| Viewer 50ms timer | Isolated ✓ | — | — |
| Map many `MarkerView` | FPS on old devices | P2 | DEFER — cluster in P2O-C |
| Image cache split | Tab vs feed | P2 | YES — tab `expo-image` |
| Story signed URL resolve | Async per cell | P2 | Prefetch ✓ on hub |

---

## 7. VIEWER + MEDIA (foundation slice)

| Issue | Severity | Required before presence? | Phase |
|-------|----------|---------------------------|-------|
| Media post/upload on device | — | Stable ✓ | Done |
| Viewer ring queue | — | ✓ | Done |
| Rail scroll-follow | P0 | **YES** | Foundation |
| Cross-ring motion | P2 | DEFER | Foundation+ |
| First-unseen index | — | ✓ | Done |
| Moment detail vs viewer | P3 | — | — |
| Map not in viewer | — | — | — |

---

## 8. AUTH + ONBOARDING (foundation)

| Route | Native | Severity | Required before presence? |
|-------|--------|----------|---------------------------|
| Login | ✓ | — | — |
| Signup | ✓ | — | — |
| Forgot/reset | ✓ | P2 | YES — recovery UX |
| Onboarding | ✓ | P2 | YES if blocking new users |
| Landing marketing | Redirect only | P3 | **DEFER** — not presence blocker |

---

## 9. MASTER ISSUE TABLE (prioritized)

| ID | Cat | Issue | Sev | PWA | Native | Recommended fix | Before presence? | Defer |
|----|-----|-------|-----|-----|--------|-----------------|------------------|-------|
| **MAP-UX-01** | Map | Sheet fake zero counts | P1 | Live counts | `0` hardcoded | Honest empty state | **YES** | Data: P2O-C |
| **MAP-UX-02** | Map | No map loading UX | P0 | Skeleton | Silent | `MapPageSkeleton` | **YES** | — |
| **MAP-UX-03** | Map | Locate ≠ GPS | P1 | GPS | Camera refit | P2O-B or rename control | **NO** | P2O-B |
| **MAP-UX-04** | Map | Expo Go map unexplained | P1 | N/A | Grid | Dev-build banner | **YES** | — |
| **MAP-H-01** | Map | Heatmap layer | — | Yes | No | Port GL heat layer | **NO** | **P2O-C** |
| **MAP-H-02** | Map | Glow/core layers | — | Yes | No | Activity circles | **NO** | **P2O-C** |
| **MAP-P-01** | Map | Friend map markers | — | Yes | No | Markers + focus | **NO** | **P2O-C** |
| **MAP-P-02** | Map | Checkpoint activity sort | P1 | Activity | Name order | Sort with counts | **NO** | **P2O-C** |
| **MAP-P-03** | Map | Auto-tour | — | Yes | No | Idle cycle | **NO** | **P2O-C+** |
| **MAP-P-04** | Map | Night map + fog | P2 | Yes | Light only | Style swap + fog | **DEFER** | VP-2D / P2O-C |
| **HUB-01** | Hub | Share card letterboxing | — | Intrinsic | Fixed h | 4:5 aspect ✓ | **YES** | Done |
| **HUB-02** | Hub | Feed virtualization | P1 | Virtual | ScrollView | FlashList | **YES** | — |
| **HUB-03** | Hub | Active friends live | — | Presence | Static | P2O-C poll | **NO** | **P2O-C** |
| **VIEW-01** | Hub | Rail scroll-follow | P0 | — | Missing | `scrollTo` index | **YES** | — |
| **LOAD-01** | Load | Tier-2 spinners | P1 | SK | Spinner | `AsyncSection` | **YES** | — |
| **LOAD-02** | Load | Route `return null` | P1 | — | Blank | Gate skeleton | **YES** | — |
| **IMG-01** | Media | Tab bar RN Image | P1 | expo | RN | expo-image | **YES** | — |
| **IMG-02** | Media | Venue RN Image | P2 | img | RN | RemoteImage | **DEFER** | P2 |
| **PERF-01** | Perf | Chat FlatList | P1 | — | All mount | Virtualize | **YES** | — |
| **SHEET-01** | Nav | Sheet abrupt close | P2 | Animated | Snap | `dismiss()` path | **DEFER** | — |
| **VP2-01** | Gate | VP-2 not signed off | P0 | Ref | Partial | Device QA checklist | **YES** | — |

---

## 10. WHAT MUST BE STABLE BEFORE PRESENCE PHASES

### ✅ Required foundation checklist (complete before `P2O-B`)

**Product truth**

- [ ] **VP-2 sign-off** — device QA vs deployed PWA ([VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) if present)
- [ ] **Media** — post, view, hub feed, profile grids, viewer (no “Image data is nil” on device)
- [ ] **No deceptive map/hub copy** — stubs labeled or hidden (MAP-UX-01, friends subtitles)
- [ ] **Auth paths** — login, signup, reset usable for native-only users

**Interaction / loading (P0/P1 from §9)**

- [ ] **MAP-UX-02** — map loading skeleton or overlay
- [ ] **MAP-UX-04** — Expo Go explanation
- [ ] **VIEW-01** — viewer rail scroll-follow
- [ ] **LOAD-01** — friends, notifications, blocks, archive, profile-edit, live-places: skeleton tier
- [ ] **LOAD-02** — no blank create/shares/blocks/username routes
- [ ] **HUB-02** — hub shares list virtualization OR enforced lower cap with OK perf
- [ ] **PERF-01** — chat thread virtualization for long threads
- [ ] **IMG-01** — tab bar avatar cache parity

**Hub UX (this pass)**

- [x] **HUB-01** — share card density / aspect (4:5, tighter margins)

### ❌ Explicitly NOT required before P2O-B (do not block gate)

These are **presence / location phase deliverables**:

- Heatmap, venue glow/core, district flow trails
- `user_presence` read/write, friend dots, inside/nearby counts
- GPS puck, real distance, checkpoint activity sort
- Auto-tour, hub active friends live strip
- Realtime postgres subscriptions
- Background location, movement intelligence
- Night map mode tied to live activity (optional with P2O-C)

### ⏳ Safe to defer until after P2O-C/D

- Landing page marketing parity
- Networked global search
- Notifications activity feed (when built)
- Sheet drag-dismiss parity
- Horizontal viewer swipe between rings
- Full night basemap without presence data

---

## 11. Recommended execution order (foundation only)

| Step | Work | Unblocks |
|------|------|----------|
| 1 | **VP-2 device QA + sign-off** | P2O-B gate |
| 2 | **Map loading + honest sheet + Expo banner** | MAP-UX-02/04/01 |
| 3 | **LOAD-01/02** — skeleton tier on stack lists | System cohesion |
| 4 | **VIEW-01** — hub rail scroll-follow | Viewer completeness |
| 5 | **HUB-02 + PERF-01** — FlashList hub + chat | Performance |
| 6 | **IMG-01** — tab bar expo-image | Avatar continuity |
| 7 | **Begin P2O-B** — `expo-location`, real Locate, distance | Location phase |
| 8 | **Begin P2O-C** — heat, glow, presence read, markers, checkpoint sort | Presence phase |

---

## 12. PWA vs native — route coverage snapshot

| PWA route | Native | Behavior % (est.) | Visual % (est.) | Before presence? |
|-----------|--------|-------------------|-----------------|------------------|
| `/hub` | hub tab | ~55% | ~75% | Polish only |
| `/map` | map tab | ~25% | ~50% | Chrome YES; layers NO (P2O-C) |
| `/chat` | chat + [id] | ~45% | ~72% | Read OK; send NO |
| `/profile` | profile | ~40% | ~68% | Partial |
| `/stories` / camera | composer | ~70% post | ~65% | Media YES |
| `/moments/[id]` | moment detail | ~60% | ~70% | YES |
| `/search` | search-discovery | ~30% | ~50% | DEFER network |
| `/notifications` | notifications | ~15% | ~40% | Skeleton YES |
| `/settings/*` | settings | ~40% local | ~50% | Partial |

*Estimates align with [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md); behavior % excludes presence/realtime by design.*

---

## 13. Sign-off statement template

> **Foundation hardening complete for presence phases:**  
> VP-2 signed off · Media stable on device · P0/P1 pre-presence rows addressed · Map shows loading + honest stubs · Hub feed dense and performant · Viewer rail continuity · No primary-path blank/spinner-only loads.  
> **Approved to start:** `P2O-B` (expo-location).  
> **Not in scope until P2O-C:** heat, glow, presence markers, activity checkpoints, hub live friends.

---

*End of final pre-presence audit. No architecture changes, no presence implementation, no speculative redesign.*
