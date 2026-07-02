# Documentation Governance — authority & safety rules

**Status:** Lock **2026-05-18**  
**Purpose:** Docs are part of the engineering architecture. Prevent stale assumptions, duplicate authority, and accidental semantic drift from old files.

**Rule:** No major map/presence implementation unless authoritative docs are aligned, phase state is accurate, and stale/deprecated docs are identified.

---

## 1. Authority tiers

| Tier | Meaning | When in conflict |
|------|---------|------------------|
| **PRIMARY** | Single source of truth — implementation must match | PRIMARY wins |
| **SECONDARY** | Implementation guidance, audits, checklists | Defer to PRIMARY |
| **TEMPORARY** | Scaffold / slice notes — may be stale | Do not drive architecture |
| **ARCHIVED** | Historical — no implementation guidance | Reference only |
| **DEPRECATED** | Superseded — must not guide work | Use replacement doc |

---

## 2. PRIMARY authorities (canonical)

| Document | Owns | Status |
|----------|------|--------|
| [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) | L0–L5 truth hierarchy, decision filter | **Current** |
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | Believable geography philosophy, confidence model | **Current** |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | Full PWA behavioral DNA (what web does today) | **Current** |
| [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) | Who may write `user_presence` | **Current** |
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) | Engineering phase gates, parity doctrine | **Current** — see drift for VP-2/media |
| [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) | Mirror → Cutover → Evolve; **`P2O-D` gate** | **Current** |
| [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) | Constants, shared package rules | **Current** |
| [packages/shared/src/presence/constants.ts](../packages/shared/src/presence/constants.ts) | Frozen time windows (code truth) | **Current** |

**Presence/map sequencing PRIMARY for intent:** [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)  
**Presence/map sequencing SECONDARY for layer detail:** [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md)

---

## 3. SECONDARY references

| Document | Purpose | Stale risk |
|----------|---------|------------|
| [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) | Presence/map chapter reference | Partially superseded by PWA_BEHAVIORAL — still valid for map chapters |
| [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) | Route/surface matrix | Update on VP-2 sign-off |
| [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) | Map layer technical roadmap | Reframed — use with NATIVE_PRESENCE_EVOLUTION |
| [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) | Media operational matrix | Active for media |
| [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) | Media plane status | **May conflict** with MIGRATION_PHASES strict VP-2 text |
| [FINAL_PRE_PRESENCE_AUDIT.md](./FINAL_PRE_PRESENCE_AUDIT.md) | Pre-presence gate snapshot | Snapshot — check dates |
| [CORE_FEEL_LOCK_AUDIT.md](./CORE_FEEL_LOCK_AUDIT.md) | L4 loading/skeleton pass | Complete for slice |
| [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) | Monorepo structure | General |
| [SUPABASE_MIGRATION_OPS.md](./SUPABASE_MIGRATION_OPS.md) | **Prod migration apply status** — what’s live, what not to re-run | Active — update on each DB migration |
| [DEVICE_QA_PARITY_CHECKLIST.md](./DEVICE_QA_PARITY_CHECKLIST.md) | QA procedure | Active |
| [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) | Sign-off checklist | Active until signed |

---

## 4. TEMPORARY docs (scaffolds / slices)

| Document | Purpose | Do not treat as |
|----------|---------|-----------------|
| [MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md) | iOS library crash slice | Permanent media architecture |
| [MEDIA_0_2A_PARITY_AUDIT.md](./MEDIA_0_2A_PARITY_AUDIT.md) | Camera slice audit | Full media truth |
| [MEDIA_0_2C_POST_REFRESH_AUDIT.md](./MEDIA_0_2C_POST_REFRESH_AUDIT.md) | Refresh slice | Global refresh architecture |
| [MAP_SHELL_DRIFT_AUDIT.md](./MAP_SHELL_DRIFT_AUDIT.md) | Shell drift snapshot | Current map semantics |
| [VP2_STABILIZATION_INVENTORY.md](./VP2_STABILIZATION_INVENTORY.md) | VP-2 inventory | Sign-off record |
| [NATIVE_MIGRATION_HANDOFF.md](./NATIVE_MIGRATION_HANDOFF.md) | Handoff notes | Phase authority |
| Parity slice audits (`CHAT_THREAD_*`, `FRIENDS_SEARCH_*`, `VP2_HUB_*`, `VP2_STORY_RING_*`) | Surface-specific | Whole-app truth |

---

## 5. DEPRECATED / superseded (do not implement from)

| Document | Superseded by | Notes |
|----------|---------------|-------|
| Informal “add GPS then heat” sequencing | [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Trust-first names |
| “Alive city” as MAP-C goal without confidence gate | [PRESENCE_TRUST_ARCHITECTURE.md §7](./PRESENCE_TRUST_ARCHITECTURE.md) | Renamed to confidence visualization |
| `apps/web/src/lib/chat.ts` (`conversations`) | `chats`/`messages` pages | **DEAD code** — [PWA_BEHAVIORAL §7](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) |

---

## 6. Per-document registry

| Document | Authority | Owner purpose | Up to date? |
|----------|-----------|---------------|-------------|
| IMPLEMENTATION_DECISION_FRAMEWORK | PRIMARY | Hard rule for all phases | ✅ 2026-05-18 |
| TRUTH_LAYER_DOCTRINE | PRIMARY | L0–L5 model | ✅ 2026-05-18 |
| VP2_APP_WIDE_AUDIT | SECONDARY | VP-2 surface status | ✅ 2026-05-18 |
| PRESENCE_TRUST_ARCHITECTURE | PRIMARY | Trust / confidence | ✅ 2026-05-18 |
| PWA_BEHAVIORAL_TRUTH_AUDIT | PRIMARY | PWA behavior | ✅ 2026-05-18 |
| NATIVE_PRESENCE_EVOLUTION | PRIMARY | Native phase intent | ✅ 2026-05-18 |
| DOCUMENTATION_GOVERNANCE | PRIMARY | This file | ✅ 2026-05-18 |
| WORKSPACE_EVOLUTION_PLAN | PRIMARY | Future folder plan | ✅ 2026-05-18 |
| TRUTH_DRIFT_REGISTER | PRIMARY | Doc/code drift | ✅ 2026-05-18 |
| SYSTEM_TRUTH_AUDIT | SECONDARY | Map/presence chapters | ✅ with pointer |
| NATIVE_MAP_EVOLUTION | SECONDARY | Layer porting | ⚠️ reframed 2026-05-18 |
| MIGRATION_PHASES | PRIMARY | Phases | ⚠️ media gate drift |
| SUPABASE_MIGRATION_OPS | SECONDARY | Prod DB migration apply status | ✅ 2026-07-02 |
| PWA_NATIVE_PARITY_AUDIT | SECONDARY | Surface matrix | ⚠️ until VP-2 sign-off |
| APP_WIDE_INTERACTION_AUDIT | TEMPORARY | Interaction snapshot | Snapshot |
| AUTH_FAILURE_AUDIT | SECONDARY | Auth errors | Active |
| V1_LAUNCH_PLAN | SECONDARY | Product launch | Not migration authority |

---

## 7. Semantic safety rule (implementation gate)

Before **any** major map/presence work:

1. Read affected **PRIMARY** doc(s)
2. Check [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) for open **High** drift
3. Cite **truth layer(s)** in PR/plan ([TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md))
4. Run decision filter ([PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md))
5. Update drift register if behavior changes

---

## 8. Maintenance responsibilities

| Event | Action |
|-------|--------|
| PWA behavior change | Update PWA_BEHAVIORAL + SYSTEM_TRUTH chapters |
| Native semantic change | Update drift register + require product sign-off |
| Phase complete | Update MIGRATION_PHASES + parity audit |
| New doc | Register here with authority tier |
| Supersede doc | Mark DEPRECATED here; add banner in old doc |

---

## 9. Cross-link graph (start here)

```
TRUTH_LAYER_DOCTRINE
  ├── PRESENCE_TRUST_ARCHITECTURE
  ├── PWA_BEHAVIORAL_TRUTH_AUDIT
  └── NATIVE_PRESENCE_EVOLUTION
        ├── NATIVE_MAP_EVOLUTION (technical)
        ├── SYSTEM_TRUTH_AUDIT (map chapters)
        └── MIGRATION_PHASES (gates)

DOCUMENTATION_GOVERNANCE
  ├── TRUTH_DRIFT_REGISTER
  └── WORKSPACE_EVOLUTION_PLAN
```

---

*Docs are architecture. Treat changes with the same rigor as API contracts.*
