# Intencity documentation index

**Start here for map/presence/native geography work.**

---

## Doctrine (PRIMARY — read before implementing)

| Doc | Read when |
|-----|-----------|
| [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) | **HARD RULE** — every PR / phase |
| [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) | Classifying any change (L0–L5) |
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | Why trust > spectacle; confidence model |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | What PWA **actually does** today |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Trust-first native phase order |
| [VP2_APP_WIDE_AUDIT.md](./VP2_APP_WIDE_AUDIT.md) | Current VP-2 surface status |
| [VP2_COMPLETION_AUDIT.md](./VP2_COMPLETION_AUDIT.md) | Final VP-2 cohesion pass + sign-off gate |
| [VP2X_EXECUTION_STABILITY_AUDIT.md](./VP2X_EXECUTION_STABILITY_AUDIT.md) | **VP-2X** — execution instability root causes (pre-P2O-B) |

---

## Governance

| Doc | Read when |
|-----|-----------|
| [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) | Which doc is authoritative |
| [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) | Doc/code mismatches |
| [WORKSPACE_EVOLUTION_PLAN.md](./WORKSPACE_EVOLUTION_PLAN.md) | Future folder layout (no moves yet) |

---

## Migration & native

| Doc | Read when |
|-----|-----------|
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) | Engineering gates, VP-2, P2O-* |
| [P2O_B_PHILOSOPHY.md](./P2O_B_PHILOSOPHY.md) | **Before P2O-B** — acquisition truth, not spectacle |
| [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) | Who may write `user_presence` |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Trust-first phase order (P2O-B/C/D, MAP-B/C) |
| [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) | Map layer technical porting (SECONDARY) |
| [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) | Surface-by-surface matrix |

---

## Specialized

| Doc | Read when |
|-----|-----------|
| [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) | Map/presence chapter detail |
| [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) | Stories/shares/media **behavior** (refresh, expiry, writes) |
| [MEDIA_ARCHITECTURE_AUDIT.md](./MEDIA_ARCHITECTURE_AUDIT.md) | Native media **current-state** (ingest, render, surfaces) |
| [INTENCITY_MEDIA_DOCTRINE.md](./INTENCITY_MEDIA_DOCTRINE.md) | Native media **target architecture** (aspect classes, rules) |
| [MEDIA_DRIFT_REGISTER.md](./MEDIA_DRIFT_REGISTER.md) | Native media **inconsistencies** (MD-001…) — fix in one pass |
| [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) | Migration status (scaffold vs broken vs deferred) |
| [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) | Shared constants rules |

---

**Rule:** No major map/presence implementation without PRIMARY docs aligned + drift register checked.
