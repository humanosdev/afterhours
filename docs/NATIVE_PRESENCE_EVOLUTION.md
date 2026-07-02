# Native Presence Evolution — trust-first roadmap

**Status:** Architecture lock **2026-05-18** — supersedes informal “add GPS / alive map” sequencing  
**Authority:** **PRIMARY** for native map/presence **phase intent**; behavioral specifics remain in [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)  
**Related:** [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) · [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) · [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) · [MIGRATION_PHASES.md](./MIGRATION_PHASES.md)

---

## 1. Five-layer precision model

Native work must specify **which layer** it advances:

| # | Layer | Trust-first objective |
|---|-------|------------------------|
| 1 | Location acquisition | Trustworthy fixes, permission honesty, no fake coords |
| 2 | Movement interpretation | Realistic velocity, dwell, anti-teleport (future) |
| 3 | Presence confidence | Semantic certainty before visual flair |
| 4 | Visual interpolation | Smooth **without** false “live” implication |
| 5 | Battery / background | Adaptive policy **after** write authority clear |

**PWA today:** Layer 1 partial, Layer 3 partial, Layers 2/4/5 minimal.  
**Do not skip to Layer 4–5 visuals while Layer 3 is dishonest.**

---

## 2. Phase restructure (trust-first names)

### Gate 0 — Doctrine lock (current)

| Objective | Deliverables |
|-----------|--------------|
| Establish governing model | This doc + TRUTH_LAYER + PRESENCE_TRUST + governance |
| Block premature alive-city | No heat, no live markers, no native writes |

**Validation:** Team acknowledges semantic vs execution split.  
**Blocked features:** All MAP-B/C/D implementation.

---

### P2O-B — Trustworthy location acquisition

**Philosophy (read first):** [P2O_B_PHILOSOPHY.md](./P2O_B_PHILOSOPHY.md) — acquisition truth, not map spectacle; PWA semantic authority.

| | |
|---|---|
| **NOT** | “Add GPS” · heat · live markers · alive city · presence writes |
| **IS** | Foreground location acquisition that respects L1 invariants |

**Objectives:**

- `expo-location` foreground watch (map-equivalent to web `watchPosition`)
- **No fake coordinates** on deny — keep last real fix
- `runLocateCycle` priority stack (sheet → check-in → you → presence → fresh read)
- Distance strings for UI (checkpoint subtitle, sheet) — **display only**, no presence write unless waived
- Map vs shell split: no double-write path when on map

**Risks:**

- Showing puck before permission story is clear
- Locate labeled “you” when only catalog refit

**Trust failure modes:**

- Invented user location
- Puck at Philly fallback
- Locate implies check-in when only camera moved

**Validation gates:**

- [ ] VP-2 signed off
- [ ] Device deny/allow GPS flows documented
- [ ] No `user_presence` write unless explicit P2O-D merge waiver

**Blocked until complete:**

- Heat, glow, friend markers with “live” copy
- Native presence writes

**Doc:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md §1.6](./PWA_BEHAVIORAL_TRUTH_AUDIT.md), [SYSTEM_TRUTH_AUDIT.md Ch.1](./SYSTEM_TRUTH_AUDIT.md)

---

### P2O-C — Semantic validation parity

| | |
|---|---|
| **NOT** | “Read live presence” |
| **IS** | Prove native **means the same things** as PWA before visuals |

**Objectives:**

- Read `user_presence` + `profiles.ghost_mode`
- Port freshness helpers verbatim (`4m` / `20m` / `60m`)
- Port `getCountsForVenue` rules before any heat
- Checkpoint sort: activity → distance
- Hub/search/live-places subtitles — correct tier copy
- Realtime + poll hybrid per surface (channel parity)
- `isLikelyMapFallbackPresence` filtering

**Risks:**

- Collapsing online/live/recent windows
- Showing heat weights from stale rows
- “Nearby” placeholder copy (drift #3)

**Trust failure modes:**

- Wrong social words for timestamp age
- Counts include self, ghost, or non-friends incorrectly
- Teleporting dots from unfiltered fallback coords

**Validation gates:**

- [ ] Side-by-side copy checklist vs PWA for hub/map/profile/search
- [ ] Checkpoint order matches PWA on same fixture data
- [ ] Sheet inside/nearby matches `getVenuePeople` rules
- [ ] UNK items from truth audit waived or resolved

**Blocked until complete:**

- MAP-C heat/glow/district flow
- Auto-tour
- Animated density
- “Alive city” marketing language in UI

---

### MAP-B — Confidence visualization (friend markers)

| | |
|---|---|
| **NOT** | “Realtime map” |
| **IS** | Show friends **only as confidently as L2 allows** |

**Objectives:**

- Friend markers from validated presence rows
- Hide fallback / stale per L3 rules
- Marker smooth (L4) — alpha intent ~0.18, **no upgrade of semantic copy**
- Tap friend → camera to venue or coords
- Ghost friends hidden from others

**Risks:**

- Smooth animation implies continuous tracking
- Showing marker when only `recent` tier applies

**Trust failure modes:**

- Jitter stacks at campus center
- Live pulse on 15-minute-old fix

**Validation gates:**

- [ ] P2O-C complete on device
- [ ] Visual honesty checklist ([PRESENCE_TRUST_ARCHITECTURE.md §6](./PRESENCE_TRUST_ARCHITECTURE.md))

**Blocked until complete:**

- Heatmap
- Venue glow
- Auto-tour

---

### MAP-C — Confidence visualization (venue energy)

| | |
|---|---|
| **NOT** | “Alive map” |
| **IS** | Port PWA energy visuals **tied to validated counts** |

**Objectives:**

- Heatmap + glow from `combined_count` (same thresholds 1/4/9/16)
- District flow (optional battery policy)
- Checkpoint pulse tied to real activity
- Auto-tour only with honest sort + idle gates
- Sheet live inside/nearby counts

**Risks:**

- **#1 trust risk** — spectacle before confidence

**Trust failure modes:**

- Glowing venue with 0 live participants
- Heat breathe animation masking stale data
- Auto-tour to “cold” venues due to catalog order bug

**Validation gates:**

- [ ] Counts match PWA for fixed test cohort
- [ ] Heat hidden when zoom / data rules say so
- [ ] Product sign-off on auto-tour annoyance vs value

**Blocked until complete:**

- MAP-D prediction
- Background location
- ML ordering

---

### P2O-D — Presence authority migration (**final phase — deferred**)

| | |
|---|---|
| **Era** | **[PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) Era 4** — **after** NOTIF-3/2/4 — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) |
| **NOT** | Next slice after Era 1 sign-off; **not** bundled with first notification work |
| **IS** | Move **single writer** to native with rollback **after** notification roadmap + dual-surface QA complete |

**Web at cutover:** overview / marketing — **no login**; `/hub`, `/map`, `/chat`, … **inaccessible**.

**Objectives:**

- Port `syncUserPresenceWithVenuesFromCoords`
- Ghost-safe upsert
- Retire web shell/map writes for migrated cohort
- Notification dedupe — one writer
- Optional `presence_source` field

**Risks:**

- Dual write → duplicate notifications
- Write on jitter → venue transition spam

**Trust failure modes:**

- Friends see you “bounce” venues
- Nearby alerts from GPS noise

**Validation gates:**

- [ ] [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) rollback plan
- [ ] INNER_CONFIRM_MS preserved
- [ ] NEARBY_THRESHOLD_M behavior verified (UNK U1)

**Blocked until complete:**

- Background write policy
- Predictive features

---

### MAP-D — Intelligent geography (future)

**Gate:** Product + privacy + confidence model in production.

| Capability | Prerequisite |
|------------|--------------|
| Predictive movement | Historical buffer + MAP-C trust |
| Background throttling | P2O-D authority |
| Motion classification | Layer 2 engine |
| ML checkpoint order | L1 product approval |

---

## 3. Semantic parity checklist (P2O-C sign-off)

Native must match PWA for:

- [ ] `FRIEND_ONLINE_BADGE_MS` (4 min)
- [ ] `MAP_ACTIVITY_WINDOW_MS` (20 min)
- [ ] `RECENT_WINDOW_MS` (60 min)
- [ ] `INNER_CONFIRM_MS` (60 s)
- [ ] Ghost overrides all copy
- [ ] `getCountsForVenue` participation rules
- [ ] Checkpoint sort keys
- [ ] No fake GPS
- [ ] Fallback coord filter
- [ ] Block/hidden exclusions

---

## 4. Execution evolution allowed

### Era 1 — Mirror (display / UX only)

| Improvement | Layer | Writes? |
|-------------|-------|---------|
| MAP-B/C visuals | 4 | No |
| Smooth marker interpolation | 4 | No |
| REALTIME display parity | 4 | No |
| Remaining surface parity | — | No `user_presence` upsert |

### Era 3 — Evolve (after Cutover)

| Improvement | Layer | Semantic change? |
|-------------|-------|------------------|
| Adaptive poll intervals | 5 | No |
| Background location policy | 5 | Maybe — product gate |
| Geofencing assist | 2 | No — if FSM output unchanged |
| Confidence score display | 2 | **Only** if new copy approved |
| MAP-D intelligence | 2–5 | Product-gated |

---

## 5. Implementation ordering (canonical)

```
Era 1 — Mirror ✅ (signed off 2026-05-18)

Era 2 — Notifications ✅ (web still writes presence)
  → NOTIF-3 → NOTIF-2 → NOTIF-4

Era 3 — Evolve ← CURRENT ([ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md))
  → EVOLVE-1 acquisition → EVOLVE-2 live map → EVOLVE-3 MAP-D lite → EVOLVE-4 background reads

Era 4 — Web cutover (optional)

Era 5 — P2O-D (final; native sole presence writer)
```

**Parallel safe:** Core Feel Lock (L4), media viewing, auth — no presence semantics.

---

## 6. Related documents

| Doc | Role |
|-----|------|
| [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) | Technical map layer porting (reframed through trust) |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | PWA behavioral DNA |
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) | Engineering phase gates (updated) |
| [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) | Known mismatches |

---

*Trust-first evolution — semantics stable, execution improves, spectacle last.*
