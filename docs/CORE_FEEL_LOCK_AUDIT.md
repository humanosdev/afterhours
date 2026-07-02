# Core Feel Lock — app-wide audit & implementation log

**Date:** 2026-05-18  
**Phase:** Production feel hardening **before** `P2O-B` / `P2O-C` (location + presence reads)  
**PWA:** Canonical UX truth · **Native:** unrestricted implementation of that truth  
**Companion:** [VP2_APP_WIDE_AUDIT.md](./VP2_APP_WIDE_AUDIT.md) · [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) · [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md)

---

## Executive summary

This pass establishes a **global loading/hydration language** (`theme/motion.ts`, `AsyncSection`, unified skeletons, `RemoteImage`) and ships **high-impact continuity fixes** across hub, map, lists, sheets, and avatars.

**Still intentionally deferred (next phases):** realtime presence, map heat/glow/markers, GPS puck, hub active-friends live strip, chat send, FlashList virtualization at scale.

---

## Classification legend

| Status | Meaning |
|--------|---------|
| **COMPLETE** | Meets Core Feel Lock bar for current scope |
| **MINOR POLISH** | Usable; small timing/visual gaps remain |
| **UNSTABLE** | Visible seams — fix before presence phases |
| **PLACEHOLDER** | Honest stub; data/feature in named phase |
| **NEXT PHASE** | Requires P2O-B/C/D or later roadmap slice |

---

## Global UX system (implemented)

| Primitive | Path | Role |
|-----------|------|------|
| Motion tokens | `apps/mobile/src/theme/motion.ts` | Fade 200ms, sheet 280/300 open, 220/260 close, skeleton pulse 900ms |
| `AsyncSection` | `components/ui/AsyncSection.tsx` | Skeleton → `FadeInView` hydrate |
| `FadeInView` | `components/ui/FadeInView.tsx` | 220ms content reveal |
| `Skeleton*` | `components/ui/Skeleton.tsx` | Unified pulse + `#141820` base |
| `ListRowSkeleton` | `components/skeletons/ListRowSkeleton.tsx` | Friends, notifications, live places |
| `MapPageSkeleton` | `components/skeletons/MapPageSkeleton.tsx` | Map chrome while venues load |
| `RemoteImage` | `components/media/RemoteImage.tsx` | expo-image + cache + holdover (venues) |
| `StoryMediaImage` | `components/media/StoryMediaImage.tsx` | Signed story media + holdover |
| `ProfileAvatar` | `components/ProfileAvatar.tsx` | expo-image + gradient underlay |
| `GlassBottomSheet` | `components/ui/GlassBottomSheet.tsx` | **Animated close** on `visible=false` |

---

## Surface-by-surface audit

### Primary tabs

| Surface | Status | Skeleton | Hydration | Images | Motion | Notes |
|---------|--------|----------|-----------|--------|--------|-------|
| **Hub** | MINOR POLISH | ✓ sections | ✓ AsyncSection | ✓ prefetch | ✓ | Rail scroll-follow on viewer open ✓; shares still ScrollView |
| **Map** | MINOR POLISH | ✓ MapPageSkeleton | ✓ fade overlay | ✓ RemoteImage sheet | ✓ | Honest density copy; dev-build banner |
| **Chat list** | COMPLETE | ✓ | — | ✓ ProfileAvatar | — | — |
| **Profile** | MINOR POLISH | ✓ header/grid | partial | ✓ | — | Actions visible during header SK |
| **Create tab** | COMPLETE | shell bg | — | — | — | Direct full-screen camera ✓ 2026-05-18 |
| **Story composer** | COMPLETE | live camera | — | — | slide | Mode rail on camera; sheet step removed (hub freeze fix) |

### Hub sub-surfaces

| Surface | Status | Notes |
|---------|--------|-------|
| Moments rail | COMPLETE | Queue + scroll-to-ring + first-unseen |
| Shares feed | MINOR POLISH | 4:5 aspect density ✓; memo undermined by inline handlers |
| Active friends | PLACEHOLDER | Static copy until P2O-C |
| Live places rail | COMPLETE | AsyncSection + RemoteImage chips |
| Comments sheet | COMPLETE | SK rows; no refetch on close (delta only) |
| Story viewer (overlay) | MINOR POLISH | Queue ✓; cross-user fade not spatial slide |

### Viewer / moments / shares detail

| Surface | Status | Notes |
|---------|--------|-------|
| **StoryViewerModal** | MINOR POLISH | Preload, pause on sheet/menu, progress isolated |
| **Moment detail** (`/moments/[id]`) | COMPLETE | Inline SK; comments + sheet |
| **Share viewer** | COMPLETE | Same as moment detail for shares |

### Profile family

| Surface | Status | Notes |
|---------|--------|-------|
| Own profile | MINOR POLISH | Grid SK; partial header load |
| Public profile | MINOR POLISH | Header SK; CTA spinner on request |
| Profile edit | COMPLETE | ProfileHeaderSkeleton |
| Archive / hidden | COMPLETE | SkeletonGrid |
| Friends list | COMPLETE | ListRowSkeleton + AsyncSection |
| Blocks | COMPLETE | ListRowSkeleton; gate shows SK not null |

### Discovery & places

| Surface | Status | Notes |
|---------|--------|-------|
| Search / discovery | COMPLETE | Explore + search SK |
| Live places | COMPLETE | ListRowSkeleton |
| Venue activity | COMPLETE | Hero SK |
| Venue sheet (map) | MINOR POLISH | Honest `—` counts; P2O-C for live |

### Social / settings / auth

| Surface | Status | Notes |
|---------|--------|-------|
| Notifications | COMPLETE | ListRowSkeleton (requests + activity) |
| Chat thread | COMPLETE | Conversation SK; gate SK |
| Settings | COMPLETE | Static / local prefs SK blocks |
| Login / signup / reset | COMPLETE | Branded + button spinners only |
| Onboarding | MINOR POLISH | Inline copy, no field SK |
| Splash / session gates | COMPLETE | AppLoadingScreen |
| Bottom nav | COMPLETE | Tab avatar expo-image + cache |

### Overlays

| Surface | Status | Notes |
|---------|--------|-------|
| Create composer sheet | COMPLETE | Instant open |
| Story composer | MINOR POLISH | Camera black start; upload spinner OK |
| GlassBottomSheet (all) | COMPLETE | Animated dismiss |
| Overflow menus | MINOR POLISH | Modal fade (not sheet timing) |

---

## Implementation log (this pass)

| Change | Files |
|--------|-------|
| Global motion tokens | `theme/motion.ts` |
| Sheet animated close | `GlassBottomSheet.tsx` |
| Map loading + banner + error | `map.tsx`, `MapPageSkeleton.tsx` |
| Map sheet honest copy + RemoteImage | `MapVenueSheet.tsx` |
| Hub rail scroll on viewer open | `hub.tsx` |
| Hub comments no close-refetch | `hub.tsx` |
| Tier-2 list skeletons | `friends`, `notifications`, `blocks`, `archive-hidden`, `profile-edit`, `LivePlacesScreen` |
| Redirect route shells | `create.tsx`, `shares/new.tsx` |
| Tab + venue images | `TabBarProfileAvatar`, `VenueChipPlaceholder`, `VenueDiscoveryThumb`, `RemoteImage` |
| Unified fade on media | `StoryMediaImage`, `ProfileAvatar`, `Skeleton` |

---

## Remaining instability (prioritized)

### Before P2O-B (foundation)

| ID | Issue | Severity |
|----|-------|----------|
| R-01 | Hub shares: no FlatList; 200 cards mounted | P1 |
| R-02 | Hub share row inline handlers defeat memo | P1 |
| R-03 | Chat thread: full transcript mount | P1 |
| R-04 | Profile tab: chrome under header skeleton | P2 |
| R-05 | Viewer: horizontal spatial handoff between rings | P2 |
| R-06 | Viewer close → rail scroll restore | P2 |
| R-07 | `u/[username]` missing param → brief null | P2 |
| R-08 | VP-2 formal device sign-off | P0 gate |

### Intentional placeholders (do not fix in Core Feel Lock)

| ID | Surface | Phase |
|----|---------|-------|
| P-01 | Map heat / glow / district flow | P2O-C |
| P-02 | Friend markers + map focus | P2O-C |
| P-03 | GPS puck + real distance | P2O-B |
| P-04 | Hub active friends live | P2O-C |
| P-05 | Checkpoint activity sort | P2O-C |
| P-06 | Auto-tour | P2O-C+ |
| P-07 | Chat send + realtime | Later |
| P-08 | Notifications activity feed data | Later |

---

## Readiness for realtime / live map phase

**Ready to start P2O-B when:**

- [x] Global loading language exists
- [x] Map shows skeleton + honest stubs (not fake zeros)
- [x] No primary-path `return null` blanks (create/shares/blocks gate)
- [x] Sheets animate closed
- [x] Viewer rail scroll-follow
- [ ] VP-2 sign-off documented
- [ ] Hub/chat perf acceptable on device (R-01–R-03 may remain if waived)

**Ready to start P2O-C when:**

- P2O-B complete (GPS, distance, locate semantics)
- Map sheet wired to `user_presence` reads
- [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) constants frozen

---

## QA checklist (device)

- [ ] Open map tab — filter/checkpoint skeleton, then fade in chrome
- [ ] Open hub share comments — sheet slides down on close (not snap)
- [ ] Tap friend ring off-screen — rail scrolls, viewer opens at first unseen
- [ ] Friends / notifications / blocks — row skeletons, not lone spinner
- [ ] Tab bar avatar matches hub avatar (no second pop-in)
- [ ] Create tab — no white/black flash frame

---

*End of Core Feel Lock audit.*
