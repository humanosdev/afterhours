# VP-2 App-Wide Audit — native vs PWA (Core Feel Lock)

**Date:** 2026-05-18  
**Phase:** VP-2 / Core Feel Lock — **before** P2O-B/C/D  
**Framework:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md)  
**PWA truth:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

**Rule:** Compare native against (1) PWA semantic behavior, (2) PWA interaction intent, (3) native execution opportunity. **No new presence intelligence** in this phase.

---

## Executive summary

| Area | Status | Priority |
|------|--------|----------|
| Global loading / skeletons | MINOR POLISH | P0 |
| Hub + viewer + composer | MINOR POLISH → camera fix **2026-05-18** | P0 |
| Map shell | MINOR POLISH | P1 |
| Profile family | MINOR POLISH | P1 |
| Tier-2 lists | COMPLETE | — |
| Auth / onboarding | COMPLETE | — |
| Chat | READ parity | P2 |
| Presence / heat / live | PLACEHOLDER (honest) | **Blocked** P2O-C+ |

---

## Classification key

| Tag | Meaning |
|-----|---------|
| **SEM** | Semantic parity required |
| **INT** | Interaction intent parity |
| **EXE** | Native may improve execution only |
| **DRIFT** | Known semantic or honesty drift |
| **NEXT** | Deferred phase |

---

## Primary tabs

| Surface | PWA intent | Native today | Seam / drift | Fix type |
|---------|------------|--------------|--------------|----------|
| **Hub** | Moments rail + shares feed + live places | ✓ AsyncSection, prefetch | Shares ScrollView perf; active friends static | EXE / NEXT P2O-C |
| **Map** | Full geography + heat + presence | Shell pins, filters, sheet | Checkpoint order, locate, heat | DRIFT / NEXT |
| **Create tab** | Open camera | Direct camera ✓ **2026-05-18** | Was sheet freeze | EXE |
| **Chat list** | Threads + previews | ✓ skeleton | No realtime | NEXT |
| **Profile** | Identity + grids + rings | ✓ | momentsCount naming (web) | SEM doc only |

---

## Hub sub-surfaces

| Surface | PWA (SEM/INT) | Native | Issue | Classification |
|---------|---------------|--------|-------|----------------|
| Moments rail | Active users only; unseen ring | ✓ queue + scroll | — | COMPLETE |
| Own moment `+` | When no active moment | ✓ | — | COMPLETE |
| Shares feed | Full-width media, 4:5 cover | ✓ edge-bleed **2026-05-18** | Inline handlers hurt memo | EXE P1 |
| Share comments sheet | Global sheet (AppShell pattern) | ✓ single provider **2026-05-18** | — | COMPLETE |
| Story viewer | 5s auto, tap zones, queue | ✓ preload, pause | No cross-user spatial handoff | EXE P2 |
| Active friends strip | Live presence subtitles | Static honest copy | No fake live | PLACEHOLDER ✓ |
| Venue chips | Venue thumb + label | ✓ RemoteImage | — | COMPLETE |
| **Create entry** | Sheet → camera | **Camera immediate** + mode rail | Sheet froze hub | **FIXED** EXE |

---

## Map family

| Surface | PWA | Native | Drift | Phase |
|---------|-----|--------|-------|-------|
| Category filters | CANON matchers | ✓ ported | — | — |
| Pins + labels | GL symbols | ✓ | — | — |
| Heat / glow / flow | Full stack | None | Honest defer | MAP-C |
| Checkpoints | Activity → distance | Catalog order | **DRIFT D-001** | P2O-C |
| Venue sheet | Live inside/nearby | `—` density | Honest | P2O-C |
| Locate | GPS two-tap | Bounds refit | **DRIFT D-002** | P2O-B |
| Friends on map | Presence markers | List only | Honest | MAP-B |
| Ghost pill | Read/write | Read-only | **DRIFT D-004** | P2O-D |
| Loading | Map ready gates | MapPageSkeleton + fade | — | COMPLETE |

---

## Profile family

| Surface | PWA | Native | Notes |
|---------|-----|--------|-------|
| Own profile | Rings, tabs, archive | ✓ | — |
| Public `/u/[username]` | Viewer + grids | ✓ | Bad username may blank |
| Profile edit | Form + avatar | ✓ skeleton | — |
| Friends | List + presence subtitles | ✓ ListRowSkeleton | Presence copy static |
| Blocks | Two lists | ✓ | — |
| Archive hidden | Hidden shares grid | ✓ | — |

---

## Stack routes

| Route | PWA | Native | Loading | Images | Modal/sheet |
|-------|-----|--------|---------|--------|---------------|
| `/chat/[id]` | Realtime + send | Read-only thread | ✓ | ✓ | — |
| `/moments/[id]` | Detail + comments | ✓ | ✓ | StoryMediaImage | Comments sheet |
| `/u/[username]` | Public profile | ✓ | partial SK | ✓ | Viewer overlay |
| `/friends` | Roster + actions | ✓ | ListRowSkeleton | ✓ | — |
| `/notifications` | Activity feed | ✓ | ListRowSkeleton | ✓ | — |
| `/search-discovery` | Discovery + trending | Partial | mixed | ✓ | Trending deferred |
| `/live-places` | Presence-weighted | Static | ListRowSkeleton | ✓ | P2O-C |
| `/venue-detail` | Venue page | Scaffold/honest | — | RemoteImage | — |
| `/venue-activity` | Activity | Parity placeholder | — | — | — |
| `/settings/*` | Prefs | ✓ | — | — | — |
| `/shares/new` | Share upload | Route exists | dark shell | — | camera via composer |
| Legal / auth | Full flows | ✓ | AppLoadingScreen | — | — |

---

## Global systems

| System | PWA | Native | Seam |
|--------|-----|--------|------|
| Splash / boot | ah-hub-feed-ready | AppLoadingScreen | Different gate — OK EXE |
| Pull-to-refresh | Full reload | N/A | EXE target |
| Tab bar hide | Overlays | overlayOpen | ✓ |
| Image hydration | Public URLs | expo-image + cache | ✓ |
| Motion tokens | CSS | motion.ts | ✓ |
| Glass sheets | CSS + wheel dismiss | GlassBottomSheet animated | ✓ |
| Story epoch | story-posted | bumpStoryEpoch | ✓ |

---

## VP-2 polish log (2026-05-18)

| Fix | Classification |
|-----|----------------|
| **Global `ShareCommentsBottomSheet`** in `CreateComposerProvider` (PWA AppShell pattern) | EXE — hub / viewer / detail share one sheet |
| **No full `load()` on detail close** — quiet `fetchMomentShareComments` on delta only | EXE |
| **Viewer comments** — no nested sheet; progress pauses; no remount on close | EXE |
| **Hub share media** — full feed width edge-bleed, PWA `52vw/280px` height, removed centered `maxWidth` box | EXE |

---

## Fake-feeling / non-premium (P0–P1)

| Issue | Severity | Status |
|-------|----------|--------|
| Create sheet froze hub under backdrop | **P0** | **Fixed** — direct camera |
| Viewer/detail comments remount on close | **P0** | **Fixed** — global sheet + no full reload |
| Hub share media gallery-like / centered | **P0** | **Fixed** — edge-bleed full width |
| Hub shares scroll jank (no virtualization) | P1 | Open |
| Viewer cross-ring transition | P2 | Open |
| Map checkpoint sort misleading | P1 | Honest until P2O-C |
| “Nearby” on map friends | P1 | Open copy fix |
| Public profile null on bad param | P2 | Open |

---

## Blocked until post–VP-2

| Feature | Why blocked |
|---------|-------------|
| Heat / glow / district flow | MAP-C after P2O-C |
| Presence markers | MAP-B after P2O-C |
| GPS puck + runLocateCycle | P2O-B |
| Hub live friends strip | P2O-C |
| Chat send + realtime | Phase 3+ |
| Search trending live | P2O-C |

---

## Camera UX change log (2026-05-18)

| Before | After |
|--------|-------|
| `CreateComposerSheet` → CTA → camera | **Full-screen camera immediately** |
| Moment/Share tabs on sheet (hub frozen under modal) | **ComposerModeRail** on camera (SEM same, EXE better) |
| shares_only from profile | Camera opens shares-only, no rail |

**Classification:** Execution evolution — same moment vs share semantics ([PWA_BEHAVIORAL §3](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)).

---

## Next VP-2 work (ordered)

1. Device-verify camera open + mode rail + no hub freeze  
2. Hub shares — stabilize handlers / consider list virtualization  
3. Map friends copy honesty pass  
4. Viewer rail restore on close (if not done)  
5. VP-2 device QA sign-off ([VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md))

---

*Update this audit when a surface moves to COMPLETE or drift is resolved.*
