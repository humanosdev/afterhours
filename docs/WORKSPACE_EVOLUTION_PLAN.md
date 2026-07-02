# Workspace Evolution Plan — documentation organization (proposed)

**Status:** Architecture only **2026-05-18** — **DO NOT reorganize folders yet**  
**Authority:** PRIMARY for future `/docs` structure  
**Related:** [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md)

---

## 1. Problem

`/docs` now mixes:

- Doctrine (truth, trust, layers)
- Behavioral audits (PWA DNA)
- Migration phases (engineering gates)
- Parity matrices (surface-by-surface)
- Temporary slice notes (MEDIA_0_x, VP2_*)
- Pre-presence snapshots

Without governance, **temporary scaffolds become permanent truth** and **older phase logic conflicts with doctrine**.

---

## 2. Principles

| Principle | Detail |
|-----------|--------|
| No move yet | Proposed layout only — avoid breaking links mid-sprint |
| PRIMARY docs stay discoverable | Short top-level names or `doctrine/` index |
| Temp docs age visibly | `slices/` or date prefix |
| One drift register | Always at `docs/TRUTH_DRIFT_REGISTER.md` |
| Code truth for constants | `packages/shared` — docs reference, don’t duplicate blindly |

---

## 3. Proposed future structure

```
docs/
├── README.md                          # Index + authority graph (NEW)
│
├── doctrine/                          # PRIMARY — never stale without review
│   ├── TRUTH_LAYER_DOCTRINE.md
│   ├── PRESENCE_TRUST_ARCHITECTURE.md
│   ├── DOCUMENTATION_GOVERNANCE.md
│   └── WORKSPACE_EVOLUTION_PLAN.md
│
├── truth/                             # PRIMARY behavioral authority
│   ├── PWA_BEHAVIORAL_TRUTH_AUDIT.md
│   ├── SYSTEM_TRUTH_AUDIT.md
│   └── TRUTH_DRIFT_REGISTER.md
│
├── native/                            # PRIMARY/SECONDARY evolution
│   ├── NATIVE_PRESENCE_EVOLUTION.md
│   ├── NATIVE_MAP_EVOLUTION.md
│   ├── NATIVE_ARCHITECTURE.md
│   ├── MIGRATION_PHASES.md
│   └── PRESENCE_OWNERSHIP.md
│
├── parity/                            # SECONDARY matrices & checklists
│   ├── PWA_NATIVE_PARITY_AUDIT.md
│   ├── DEVICE_QA_PARITY_CHECKLIST.md
│   ├── VP2_DEVICE_QA_SIGNOFF.md
│   └── … surface audits (chat, friends, hub, rings)
│
├── media/                             # SECONDARY media plane
│   ├── MEDIA_BEHAVIOR_MATRIX.md
│   ├── MEDIA_SYSTEM_STATUS.md
│   └── slices/                        # TEMPORARY
│       ├── MEDIA_0_1_STABILIZATION.md
│       └── …
│
├── map/                               # SECONDARY map-specific
│   └── MAP_SHELL_DRIFT_AUDIT.md
│
├── audits/                            # TEMPORARY / snapshots
│   ├── FINAL_PRE_PRESENCE_AUDIT.md
│   ├── CORE_FEEL_LOCK_AUDIT.md
│   ├── APP_WIDE_INTERACTION_AUDIT.md
│   └── …
│
├── product/                           # SECONDARY non-migration
│   └── V1_LAUNCH_PLAN.md
│
└── archive/                           # ARCHIVED — no implementation
    └── (deprecated docs moved here with banner)
```

**Current state:** All files remain in flat `docs/` until explicit migration sprint.

---

## 4. `docs/README.md` (proposed content)

When created, the index should list:

1. **Start here** — doctrine graph
2. **Implementing map/presence?** — PWA_BEHAVIORAL → NATIVE_PRESENCE_EVOLUTION → TRUTH_LAYER
3. **Implementing a surface?** — PWA_NATIVE_PARITY_AUDIT + MIGRATION_PHASES
4. **Media?** — MEDIA_BEHAVIOR_MATRIX
5. **Stale?** — TRUTH_DRIFT_REGISTER

---

## 5. Naming conventions (future)

| Pattern | Use |
|---------|-----|
| `*_DOCTRINE.md` / `*_ARCHITECTURE.md` | PRIMARY, long-lived |
| `*_AUDIT.md` | Behavioral snapshot — date in header |
| `*_PARITY_*.md` | Native vs PWA matrix |
| `MEDIA_0_*` / `VP2_*` | Temporary slice — move to `slices/` |
| `FINAL_*` / `PRE_*` | Point-in-time gate — `audits/` |

---

## 6. Migration steps (when approved)

1. Add `docs/README.md` index (no moves)
2. Create subfolders
3. `git mv` with redirect banners in old paths (one PR)
4. Update all internal links (ripgrep audit)
5. Update DOCUMENTATION_GOVERNANCE registry
6. CI check: broken doc links (optional)

**Not in scope now.**

---

## 7. Code workspace (unchanged)

```
apps/web/          # PWA production truth (behavior)
apps/mobile/       # Native implementation
packages/shared/   # Deterministic semantics (constants, FSM)
```

Doctrine docs **describe** `apps/web`; they do not replace reading code for edge cases.

---

*Proposed organization — stabilize doctrine in place first, restructure later.*
