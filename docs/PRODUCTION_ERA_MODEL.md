# Production era model

**Status:** Architecture lock **2026-06-05** · **Resequenced** — Evolve before presence authority  
**Authority:** Binds [MIGRATION_PHASES.md](./MIGRATION_PHASES.md), [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md), [NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md), [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md), [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md)

---

## Five eras (do not skip)

| Era | Name | Web (`apps/web`) | Native (`apps/mobile`) | Gate to enter |
|-----|------|------------------|------------------------|---------------|
| **1** | **Mirror** | **Production app** — login, all routes, **sole `user_presence` writer** | **Read + display parity** — mirror PWA surfaces, semantics, and map/presence **meaning**; **no** physical presence writes | **Signed off 2026-05-18** |
| **2** | **Notifications & delivery** | **Stays production** for testing — still **sole `user_presence` writer** | **NOTIF-3 → NOTIF-2 → NOTIF-4** — badges, toasts, push, native-side **`createNotification`** for native user actions | **Era 1 sign-off** |
| **3** | **Evolve** | **Stays production** — web still writes presence during Evolve | **Native precision** — acquisition, live map refresh, marker interpolation, MAP-D lite — **reads + display only** until Era 5 | **Era 2 complete** |
| **4** | **Cutover** *(optional)* | **Marketing / overview only** — product routes blocked | Native is primary app surface; **presence writes still web** until Era 5 | Product choice |
| **5** | **Presence authority** | Retire web GPS + `user_presence` upserts for native cohort | **`P2O-D`** — sole writer, presence-driven notify orchestrator | **After Era 3 Evolve stable** — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) |

**Hard rules:**

- **`P2O-D` is Era 5**, not “next after map.” See [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md).
- **Era 3 Evolve** may improve GPS acquisition, refresh cadence, and visual interpolation — **must not** upsert `user_presence` until Era 5 (no dual-write).
- **NOTIF-2/3/4** shipped while web still writes presence; presence-driven notification types stay on web until **`P2O-D`**.

---

## Era 1 — Mirror ✅ (signed off)

**Era 1 exit:** 2026-05-18 — native same-or-better on critical paths; web remains production + presence writer.

Mirror-era slices: **VP-2**, **P2O-A/B/C**, **MAP-B/C**, **CHAT-1**, **REALTIME-1**, **MEDIA-1**, **SETTINGS-1**, etc. — see [MIGRATION_PHASES.md](./MIGRATION_PHASES.md).

---

## Era 2 — Notifications & delivery ✅

**Goal:** Native notification product feel while web keeps writing `user_presence`.

| Slice | Status |
|-------|--------|
| **NOTIF-1** | ✅ Feed + friend requests |
| **NOTIF-3** | ✅ Badges + DM toast |
| **NOTIF-2** | ✅ Native notify creates |
| **NOTIF-4** | ✅ Expo push |

Details: [NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md).

---

## Era 3 — Evolve **(current)**

**Goal:** Make **“where is live tonight?”** feel instant and precise on native — friends, heat, venue energy — **without** changing what “live” means.

**Plan:** [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md)

| Slice | Delivers |
|-------|----------|
| **EVOLVE-1** | GPS accuracy filters, map-focus watch, local “you” puck (no DB write) |
| **EVOLVE-2** | Faster presence refresh on map, marker interpolation, heat live updates |
| **EVOLVE-3** | MAP-D lite — dwell/velocity hints for display (product-gated copy) |
| **EVOLVE-4** | Battery-aware background **read** policy (pre–P2O-D) |

**Hard rule:** `@intencity/shared` windows (`4m` / `20m` / `60m` / `60s` inner confirm / `300m` nearby) stay authoritative for labels and counts.

---

## Era 4 — Web cutover (optional)

Marketing-only web — **no login**, `/hub` `/map` `/chat` blocked — can wait if PWA QA still needed.

Does **not** require Era 5 if web presence writes remain for a beta cohort.

---

## Era 5 — Presence authority (`P2O-D` — final gated slice)

**Placeholder:** [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md)

- Port `syncUserPresenceWithVenuesFromCoords` + ghost-safe upsert
- **Single writer** — retire web presence upserts for migrated users
- Move **presence-driven** notification creation to native orchestrator
- Higher write cadence (2–5s) so friends/heat reflect phone GPS in near-real-time
- Rollback / `presence_source` cohort — **never** casual dual-write

---

## What NOT to do in Era 3

- Enable **`P2O-D`** early because map “looks done”
- Dual-write web + native presence for convenience
- Collapse 4m online vs 20m live windows
- Show heat/glow for venues with 0 live participants (trust collapse)

---

## Doc cross-links

| Doc | Role |
|-----|------|
| [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md) | PWA DNA + Evolve slices |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Five-layer precision model |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | PWA behavioral source |
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) | Engineering phase gates |

---

*Era 1 done → Era 2 notifications done → **Era 3 Evolve (precision)** → optional web cutover → **Era 5 P2O-D last**.*
