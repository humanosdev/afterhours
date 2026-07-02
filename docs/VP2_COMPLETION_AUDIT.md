# VP-2 completion audit — cohesion pass (2026-05-18)

**Phase:** VP-2 execution stabilization only — **no P2O-B**, no `expo-location`, no presence writes, no heat/glow.  
**Authority:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) · [INTENCITY_MEDIA_DOCTRINE.md](./INTENCITY_MEDIA_DOCTRINE.md) · [P2O_B_PHILOSOPHY.md](./P2O_B_PHILOSOPHY.md)

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **VP-2 ready for sign-off?** | **YES (signed off 2026-05-18)** — prior phases + cohesion pass accepted; device QA recommended but not blocking geography gate |
| **P2O-B ready to start?** | **YES — started** — `expo-location` + map foreground watch + locate cycle (no presence writes) |

Native is aligned on philosophy: **same product, better execution** — not a different app.

---

## What this pass implemented

### 1. Media cohesion (doctrine-driven)

| Item | Change |
|------|--------|
| Layout tokens | `mediaLayout.hubShareArticle` rhythm (PWA `pb-10`, action spacing) |
| Hub shares | Removed card dividers; PWA spacing; edge bleed retained; `layoutClass` on media |
| Skeleton parity | `HubShareCardSkeleton` height = `hubShareMediaHeight()` |
| Composer | `ComposerMediaPreview` WYSIWYG (prior MEDIA-1 slice) |
| Viewer | `StoryViewerMediaLayer` memo — progress tick no longer re-renders full-screen decode |
| Venues | `RemoteImage` + unified `venueHero.height` (prior slice) |

### 2. Smoothness / seams

| Item | Change |
|------|--------|
| Hub comments | Global `ShareCommentsBottomSheet`; hub optimistic `onCommentsChanged` delta |
| Viewer comments | No reload on close; empty handler avoids spurious refetch |
| Comments sheet | Skip refetch when reopening **same** story (cached thread) |
| Moment detail | `refreshCommentsQuietly()` only — no full `load()` on comment close |
| Tab avatar | Always `TabBarProfileAvatar` with grey ring underlay — no User-icon → photo swap |

### 3. Hub shares polish (execution only)

- Vertical rhythm matches PWA (`paddingBottom: 40`, `mt-3` actions, preview gaps)
- No semantic feed changes (still height-capped media, edge bleed, same data)
- `HubShareFeedList` + memoized rows — stable handlers, fewer cascade rerenders

### 4. Performance stabilization

| Surface | Improvement |
|---------|-------------|
| Hub shares | `HubShareFeedList` / `ShareRow` memo + stable `useCallback` handlers |
| Story viewer | Isolated `StoryViewerMediaLayer` from progress interval |
| Comments | Avoid redundant Supabase fetch on sheet reopen (same story) |

---

## Classification of changes (framework)

| Change | Class |
|--------|-------|
| Hub spacing / bleed | **EXE** |
| Media tokens / skeleton parity | **EXE** |
| Viewer media memo | **EXE** |
| Comments cache / no reload | **EXE** |
| Map locate / presence / heat | **Not touched** ✓ |

---

## Remaining seams (post-pass)

### P1 — Device QA required

| ID | Seam | Severity | Notes |
|----|------|----------|-------|
| **VP2-01** | Full device pass vs deployed PWA | **Gate** | [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) |
| **VP2-02** | Tab avatar flash on cold start | Low | `useMyAvatar` holdover; verify on device (MD-109) |
| **VP2-03** | Camera center-crop vs PWA pinch crop | Low | MD-106 partial — acceptable for VP-2 |
| **VP2-04** | Hub shares ScrollView vs FlatList | Low | Memo helps; FlatList optional if scroll jank on long feeds |
| **VP2-05** | Cross-user story queue handoff | Low | EXE P2 — no spatial transition |

### P2 — Documented drift (not VP-2 blockers)

| ID | Seam | Phase |
|----|------|-------|
| D-001 | Checkpoint sort = catalog vs activity | P2O-C |
| D-002 | Locate = bounds refit vs GPS cycle | P2O-B |
| D-003 | Map friends “Nearby” placeholder | P2O-C |
| D-004 | Ghost toggle read-only | P2O-D |
| MD-107 | Story look filters UI unused | MEDIA-1.1 |
| MD-303 | Profile avatar upload stub | MEDIA-1 |

### P0 — None open in code from this pass

Library crash / auth blockers — verify on device per existing QA doc.

---

## Media drift register status

| Tier | Status |
|------|--------|
| P0 (MD-001–004) | **Closed** in code (MD-002/106 partial = center crop) |
| P1 (MD-101–108) | **Closed** or accepted |
| P1 MD-109 | **Open** — tab avatar; mitigated, needs device confirm |
| P2 | Mostly closed; MD-202 CDN/schema deferred |

---

## VP-2 sign-off checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Media doctrine tokens + unified renderers | ✅ Code |
| 2 | Hub share rhythm / bleed / skeleton parity | ✅ Code |
| 3 | Comments seam (no viewer/detail reload) | ✅ Code |
| 4 | No map/presence/heat semantics touched | ✅ |
| 5 | Device QA vs PWA | ⬜ Recommended (non-blocking for P2O-B start) |
| 6 | `MIGRATION_PHASES.md` VP-2 line updated | ✅ 2026-05-18 |
| 7 | No P0 library/camera crash on device | ⬜ Device |

**Status:** **VP-2 signed off** in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md). **P2O-B** implementation begun (map GPS acquisition). Continue device QA in parallel on dev client.

---

## P2O-B blockers (trustworthy acquisition — not started)

These are **intentionally deferred**, not VP-2 failures:

1. **VP-2 sign-off** (this doc + device QA)
2. **`SYSTEM_TRUTH_AUDIT.md` Ch.1** — UNK rows for locate/watchPosition waived or resolved
3. **`P2O_B_PHILOSOPHY.md` implementation plan** — foreground GPS, permission flows, `runLocateCycle` port, **no `user_presence` write**
4. **Drift D-002** — locate semantics fixed as **execution** in B, not redesign

**Do not start:** heat, glow, live markers, background tracking, presence writes, native authority.

---

## Filter confirmation

> Does this increase believable social geography?

| Work in this pass | Answer |
|-------------------|--------|
| Media WYSIWYG + honest loading | **Yes** — trust in what you post vs what you see |
| Hub rhythm + fewer rerenders | **Yes** — calmer, more intentional feed |
| Comments without reload | **Yes** — social thread continuity |
| P2O-B GPS | **Not in this pass** — correct ordering |

---

## Related docs

- [VP2_APP_WIDE_AUDIT.md](./VP2_APP_WIDE_AUDIT.md)
- [MEDIA_DRIFT_REGISTER.md](./MEDIA_DRIFT_REGISTER.md)
- [MEDIA_ARCHITECTURE_AUDIT.md](./MEDIA_ARCHITECTURE_AUDIT.md)
- [P2O_B_PHILOSOPHY.md](./P2O_B_PHILOSOPHY.md)
