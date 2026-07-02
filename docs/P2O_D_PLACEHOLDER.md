# P2O-D — Presence authority migration (deferred placeholder)

**Status:** **Deferred** — **Era 5** (last) in the production era model  
**Date:** 2026-06-05 (resequenced — Evolve is Era 3, P2O-D is Era 5)  
**Authority:** [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) · [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md) · [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) · [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)

---

## Decision

**`P2O-D` is Era 5 — not the next slice.**

Web/PWA stays the **sole `user_presence` writer** while native ships **Era 3 Evolve** (GPS precision, local puck, live map refresh — **reads/display only**) and optional **Era 4 web cutover** (marketing-only).

**`P2O-D` runs last** — after Evolve is stable and you are ready to retire dual-surface testing.

---

## What P2O-D still is (unchanged scope)

When scheduled:

- Port `syncUserPresenceWithVenuesFromCoords` + ghost-safe upsert from PWA
- Native becomes **single writer** for `user_presence`
- Retire web GPS / presence upserts for the native cohort (`presence_source` / feature flag)
- **Presence-driven notification creation** moves to native orchestrator (types that today follow `userPresenceVenueSync` on web)
- Rollback plan per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) — **no** casual dual-write

---

## What is explicitly allowed before P2O-D

| Work | Allowed? | Notes |
|------|----------|--------|
| **NOTIF-3** — hub badge, message toast, chat tab badge | ✅ | Display only; web still creates rows |
| **NOTIF-2** — native `createNotification` for **user actions on native** | ✅ | Likes, comments, FR accepted from native UI |
| **NOTIF-4** — APNs/FCM | ✅ | Delivery; prefs already in Supabase (SETTINGS-1) |
| **WEB-CUTOVER** — product routes blocked on web | ⚠️ Optional before P2O-D | Marketing-only web **without** native writes if you still need web map for QA |
| **Native `user_presence` upsert** | ❌ | P2O-D only |
| **Dual-write** web + native presence | ❌ | Never |

---

## Blocked until P2O-D

- Native ghost toggle **writing** `profiles.ghost_mode` + presence sync (display-only toggle OK if read-only)
- Background location write policy
- MAP-D / predictive geography writes
- Declaring Era 2 “Cutover complete” for presence authority

---

## Gate checklist (when you pull this off the shelf)

- [ ] NOTIF-3 + NOTIF-2 + NOTIF-4 QA’d on device
- [ ] [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) rollback + cohort flag documented
- [ ] No duplicate `friend_online` / venue transition rows during beta
- [ ] INNER_CONFIRM_MS / NEARBY_THRESHOLD_M parity verified vs PWA
- [ ] Web presence upserts disabled for migrated cohort only

---

*Placeholder only — do not implement until notifications roadmap is done and dual-surface testing is no longer required.*
