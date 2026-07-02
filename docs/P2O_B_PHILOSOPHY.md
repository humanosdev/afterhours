# P2O-B philosophy — trustworthy acquisition (preparation)

**Status:** **In progress** — VP-2 signed off 2026-05-18; map foreground location landed (slice 1)  
**Date:** 2026-05-18  
**Authority:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) · [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) · [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

---

## Phase transition

| Phase | Nature |
|-------|--------|
| **VP-2** | Execution stabilization — cohesion, media, loading, seams, honesty |
| **P2O-B** | Trust foundation — **can native understand physical location correctly and honestly?** |
| **P2O-C** | Semantic interpretation parity — prove native means the same world as web |
| **MAP-B/C** | Confidence visualization — only after acquisition + semantics are honest |
| **P2O-D** | **Era 2 only** — native authority migration (writes); **after** full Mirror sign-off |

```txt
VP-2 (lock / stabilization)
  ↓
P2O-B (trustworthy acquisition)
  ↓
P2O-C (semantic interpretation parity)
  ↓
MAP-B/C (confidence visualization + alive city feel)
  ↓
Mirror backlog (all PWA surfaces — still no presence writes, no notification authority)
  ↓
Era 1 sign-off (native ≥ PWA feel)
  ↓
P2O-D / Era 2 (native writes + NOTIF-2/3; web → overview only)
  ↓
Era 3 (evolve beyond PWA limiters)
```

---

## The one rule

```txt
PWA remains semantic authority.
Native evolves execution quality only.
```

Native is **not** redesigning Intencity. It is **rebuilding the PWA’s semantic machine** with higher-quality acquisition and native execution.

| Preserved (semantics) | Improved (execution) |
|----------------------|----------------------|
| Inside / nearby / live / recent / online | GPS fix quality |
| Venue interpretation | Movement continuity |
| Freshness windows | Permission lifecycle |
| Ghost behavior | Locate responsiveness |
| Checkpoint philosophy | Battery-aware foreground watch |
| Visibility rules | Coordinate freshness honesty |

**Filter for every change:**

> **Does this increase believable social geography?**

If it only increases spectacle without trust → **do not ship**.

---

## What P2O-B is

```txt
“Can native understand physical location correctly and honestly?”
```

**Truth foundation work — not visual work.**

| In scope | Out of scope (later phases) |
|----------|----------------------------|
| Foreground `expo-location` (map-equivalent to web `watchPosition`) | Presence **writes** |
| Permission lifecycle (honest deny/allow) | Authoritative tracking |
| True device coordinate stream while app open | Live friend markers |
| Native location freshness | Heat / glow / alive city |
| Movement updates (foreground) | Realtime interpolation spectacle |
| `runLocateCycle` parity (sheet → check-in → you → presence → fresh read) | Background presence ownership |
| Distance strings for UI (**display only**) | Geofencing authority |
| Stable locate behavior (no fake refit semantics) | Confidence visualization |
| Map vs shell split (no double-write path) | Notifications from location |
| No invented coordinates on deny | Predictive movement |

**Why spectacle waits:**

```txt
Bad acquisition poisons everything downstream.
```

If GPS quality is wrong → venue counts lie, people teleport, nearby breaks, checkpoint sorting lies, **trust dies**.

---

## What P2O-B is NOT

Do **not** interpret P2O-B as:

- Live map spectacle
- Heat / glowing cities
- Realtime markers
- Social animations
- “Alive city” systems
- A chance to redesign map UX
- Native-only product semantics

---

## How to think about improvements

When native UX feels better, it should read as:

```txt
“What the PWA would have done if browser limitations didn’t exist.”
```

**Not:**

```txt
“Random new native invention.”
```

Coordinates are **fuel**. **Semantics are the product.**

---

## Mandatory audit before any map/location work

### 1. Audit PWA first

| Question | Source |
|----------|--------|
| How does PWA acquire location? | [PWA_BEHAVIORAL_TRUTH_AUDIT.md §1](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) |
| How often? Freshness rules? | [SYSTEM_TRUTH_AUDIT.md Ch.1](./SYSTEM_TRUTH_AUDIT.md) |
| What semantics depend on it? | Ch.2–6 same doc |
| What UI meaning depends on it? | Hub, map sheet, checkpoints, search |
| CANON vs WEB-WA vs HEUR? | [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) |
| Execution limit vs intended behavior? | Classify before coding |

### 2. Classify the change

| Type | Action |
|------|--------|
| Semantic parity | Match PWA meaning **exactly** |
| Execution evolution | Improve engine; **freeze** meaning |
| Speculative native feature | **Block** |
| Visual-only “alive” feel | **Block** until P2O-C + MAP gates |

### 3. Ask the right question

```txt
“How do we preserve meaning while improving trust?”
```

**Not:** “How do we redesign this?”

---

## P2O-C (preview — not started)

P2O-C does **not** add new semantics. It proves:

```txt
“Does native understand the same world as web?”
```

- Read `user_presence` + `profiles.ghost_mode`
- Port freshness helpers verbatim (`4m` / `20m` / `60m`)
- Port `getCountsForVenue` before any heat
- Checkpoint sort: activity → distance
- Realtime + poll hybrid per surface
- Filter `isLikelyMapFallbackPresence`

See [NATIVE_PRESENCE_EVOLUTION.md § P2O-C](./NATIVE_PRESENCE_EVOLUTION.md).

---

## Current priority (P2O-B active)

**P2O-B slice 1 (shipped in repo):**

- `expo-location` + iOS/Android when-in-use permission strings
- `useForegroundLocation` — foreground watch on Map tab (mirrors web `watchPosition`)
- Locate cycle — sheet venue → you; two-tap zoom (15.5 / 1.65); **no** `user_presence` write
- Mapbox `LocationPuck` when permission granted

**P2O-B slice 2 (next):**

- App foreground refresh on resume (web `visibilitychange` parity)
- Locate: check-in venue center when **P2O-C** reads `user_presence`
- Distance strings on checkpoint bar (display only)
- Device QA on dev client (not Expo Go)
- Media / rendering consistency ([INTENCITY_MEDIA_DOCTRINE.md](./INTENCITY_MEDIA_DOCTRINE.md))
- Loading, smoothness, viewer orchestration
- Cache / perceived performance
- Seam removal
- Continuous PWA audits ([TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md))

**Avoid:**

- Speculative redesign
- Feed / map philosophy changes
- New social systems
- Spectacle-first implementation

---

## P2O-B implementation gates (checklist)

Slice 1 gates:

- [x] **VP-2 signed off** (2026-05-18)
- [x] `expo-location` + foreground watch on Map ([P2O_B_SLICE1.md](./P2O_B_SLICE1.md))
- [x] No `user_presence` write in slice 1
- [ ] [SYSTEM_TRUTH_AUDIT.md Ch.1](./SYSTEM_TRUTH_AUDIT.md) UNKs waived or resolved for full P2O-B close
- [ ] Device QA matrix for deny / allow / stale / no-fix paths (dev client rebuild required)
- [ ] App resume location refresh (slice 2)

---

## Related docs

| Doc | Role |
|-----|------|
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Phase objectives + validation gates |
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | Confidence model |
| [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) | Technical porting notes (secondary) |
| [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) | Known semantic drift (e.g. D-003 locate) |
