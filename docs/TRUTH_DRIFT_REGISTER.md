# Truth Drift Register — docs ≠ implementation

**Status:** Living document **2026-05-18**  
**Authority:** PRIMARY — check before map/presence work  
**Maintenance:** Update on any drift discovery or resolution  
**Related:** [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) · [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

---

## Severity

| Level | Meaning |
|-------|---------|
| **Critical** | Wrong semantics shipped or dual-write risk |
| **High** | User-visible lie or trust collapse |
| **Med** | Honest deferral mislabeled; doc conflict |
| **Low** | Naming, optional paths, doc-only |

---

## Active drift entries

### D-001 — Checkpoint sort (native vs PWA)

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Semantic?** | Yes (L1) |
| **PWA truth** | Activity desc → distance asc |
| **Native truth** | Catalog order (category filter only) |
| **Affected code** | `apps/mobile/app/(app)/(tabs)/map.tsx`, checkpoint components |
| **Affected docs** | PWA_BEHAVIORAL §1.5, NATIVE_MAP_EVOLUTION §5 |
| **Canonical truth** | [PWA_BEHAVIORAL_TRUTH_AUDIT.md §1.5](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) |
| **Fix phase** | P2O-C — do not fake sort before reads |
| **Status** | **Resolved** — `buildMapCheckpoints` in `venuePresenceStats.ts` (MAP-C / Phase 0 verify) |

---

### D-002 — Locate semantics

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Semantic?** | Yes (L1 locate priority) |
| **PWA truth** | `runLocateCycle` GPS two-tap |
| **Native truth** | Camera refit to venue bounds |
| **Affected code** | `VenuesMapCanvas.tsx`, `map.tsx` |
| **Fix phase** | P2O-B |
| **Status** | Open |

---

### D-003 — Map friends subtitle “Nearby”

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Semantic?** | Yes (L1 copy) |
| **PWA truth** | Tiered presence subtitles |
| **Native truth** | Placeholder “Nearby” for all |
| **Fix phase** | P2O-C / [NATIVE_CUTOVER Phase 0](./NATIVE_CUTOVER.md) |
| **Status** | **Resolved** — map friend drawer uses `getFriendPresenceCopyFromRow` |

---

### D-004 — Ghost toggle write

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Semantic?** | Yes (ghost + write shape) |
| **PWA truth** | `profiles.ghost_mode` + ghost-safe upsert |
| **Native truth** | Local/read-only toggle |
| **Fix phase** | [NATIVE_CUTOVER Phase 2](./NATIVE_CUTOVER.md) (native sole writer) |
| **Status** | Open — until native presence writes ship |

---

### D-004b — Friend copy ladder split (Phase 0)

| Field | Value |
|-------|-------|
| **Severity** | **High** |
| **Was** | Hub GPS generic vs profile `venue_id` vs map “Nearby” |
| **Fix phase** | [NATIVE_CUTOVER Phase 0](./NATIVE_CUTOVER.md) |
| **Status** | **Resolved** — `getFriendPresenceCopy` + `friendSocialGate` in `@intencity/shared` |

---

### D-004c — Write/read radius fallback mismatch

| Field | Value |
|-------|-------|
| **Severity** | **Med** |
| **Was** | Write 35/110m vs read 80/200m |
| **Fix phase** | [NATIVE_CUTOVER Phase 0](./NATIVE_CUTOVER.md) |
| **Status** | **Resolved** — unified 80/200 via `venueRadii.ts` |

---

### D-005 — Heat / glow / alive city

| Field | Value |
|-------|-------|
| **Severity** | **Med** (deferred honestly) |
| **PWA truth** | Full heat stack |
| **Native truth** | Absent |
| **Risk** | Shipping visuals before D-001/D-003 fixed = **Critical** trust risk |
| **Fix phase** | MAP-C after P2O-C |
| **Status** | Open (intentional defer) |

---

### D-006 — MIGRATION_PHASES vs MEDIA_SYSTEM_STATUS (VP-2 writes)

| Field | Value |
|-------|-------|
| **Severity** | **Med** |
| **Doc conflict** | MIGRATION_PHASES strict VP-2 “no writes” vs code/docs allowing `uploadStoryMedia`, likes, comments |
| **Canonical** | [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) for media plane until MIGRATION_PHASES reconciled |
| **PWA_BEHAVIORAL** | Notes gate drift (U6) |
| **Status** | Open — product reconcile |

---

### D-007 — Profile `momentsCount` misnamed (web)

| Field | Value |
|-------|-------|
| **Severity** | **Low** |
| **PWA truth** | State populated from share count query |
| **Affected** | `apps/web/src/app/profile/page.tsx` |
| **Status** | Open (web bug, document only) |

---

### D-008 — Archive expiry `min()` cap (web)

| Field | Value |
|-------|-------|
| **Severity** | **Med** |
| **PWA truth** | `momentWindow.ts` uses `min(expires_at, created+24h)` |
| **Drift** | `ProfileStoriesGrid` archive may disagree |
| **Status** | Open |

---

### D-009 — Story view recording (shares on detail page)

| Field | Value |
|-------|-------|
| **Severity** | **Low** |
| **PWA truth** | Viewer skips share views; detail page may record |
| **Status** | Open (documented HEUR drift) |

---

### D-010 — `upsertMyPresence` vs `userPresenceWrite` columns

| Field | Value |
|-------|-------|
| **Severity** | **Med** |
| **UNK** | U7 — `last_updated_at` vs `updated_at` |
| **Status** | Open |

---

### D-011 — NATIVE_MAP_EVOLUTION “alive city” framing

| Field | Value |
|-------|-------|
| **Severity** | **Med** (doc-only) |
| **Issue** | MAP PHASE C titled “alive city” without confidence gate |
| **Replacement truth** | [NATIVE_PRESENCE_EVOLUTION.md MAP-C](./NATIVE_PRESENCE_EVOLUTION.md) — confidence visualization |
| **Status** | Mitigated 2026-05-18 — NATIVE_MAP_EVOLUTION banner added |

---

### D-012 — Hub postgres realtime on native

| Field | Value |
|-------|-------|
| **Severity** | **Low** |
| **PWA truth** | `postgres_changes` on `stories` |
| **Native truth** | `story-posted` / epoch bump |
| **Status** | Open (acceptable execution diff) |

---

### D-013 — Pull-to-refresh full reload (web)

| Field | Value |
|-------|-------|
| **Severity** | **Low** |
| **PWA-LIAB** | `window.location.reload()` |
| **Native** | Should use epoch invalidation (NATIVE-TGT) |
| **Status** | Open |

---

### D-017 — iOS OS push deferred (Apple Developer Program)

| Field | Value |
|-------|-------|
| **Severity** | **Med** |
| **Issue** | NOTIF-4 code shipped but iPhone cannot register `push_subscriptions` without paid Apple enrollment |
| **Native truth** | In-app notifications + Realtime work; lock-screen push on iOS blocked |
| **Fix phase** | [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md) |
| **Status** | Open — honest deferral; validate push on Android/PWA until enrolled |

---

### D-015 — Hub share media centered gallery box

| Field | Value |
|-------|-------|
| **Severity** | **High** (UX) |
| **Issue** | `aspectRatio` + `maxWidth` + `alignSelf: center` shrank media in feed |
| **Fix** | Full-bleed width + fixed height (PWA `52vw/280px`) |
| **Status** | **Resolved** 2026-05-18 |

### D-016 — Comments remount from viewer/detail

| Field | Value |
|-------|-------|
| **Severity** | **High** (UX) |
| **Issue** | Nested sheets + `load()` on detail close |
| **Fix** | Global sheet in `CreateComposerProvider`; quiet comment refresh |
| **Status** | **Resolved** 2026-05-18 |

### D-014 — Native create sheet froze hub

| Field | Value |
|-------|-------|
| **Severity** | **High** (UX) |
| **Issue** | `CreateComposerSheet` modal left hub visible but non-interactive; tab taps felt like freeze |
| **Fix** | `openCreateComposer` → full-screen `StoryComposerModal` + `ComposerModeRail` |
| **Classification** | EXE — same moment/share semantics |
| **Status** | **Resolved** 2026-05-18 |

---

## Resolved / waived

| ID | Resolution | Date |
|----|------------|------|
| D-014 | Direct camera + in-composer mode rail | 2026-05-18 |
| D-015 | Hub share edge-bleed media | 2026-05-18 |
| D-016 | Global comments sheet | 2026-05-18 |

---

## Doc staleness warnings

| Document | Warning |
|----------|---------|
| FINAL_PRE_PRESENCE_AUDIT | Point-in-time gate — prefer PWA_BEHAVIORAL for behavior |
| APP_WIDE_INTERACTION_AUDIT | Pre–Core Feel Lock — check CORE_FEEL_LOCK_AUDIT |
| NATIVE_MIGRATION_HANDOFF | Handoff snapshot — verify MIGRATION_PHASES |
| MAP_SHELL_DRIFT_AUDIT | Shell-only — not presence semantics |

---

## Implementation truth sync process

1. Engineer discovers mismatch → add row here
2. Classify semantic (L1) vs execution (L4–L5)
3. Point to **canonical** doc section
4. Set fix phase from [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)
5. Close row when device-verified

---

*If it's not in this register and not in PRIMARY docs, assume unknown until audited.*
