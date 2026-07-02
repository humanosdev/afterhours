# Presence Trust Architecture — believable social geography

**Status:** Architecture lock **2026-05-18** — **no implementation** in this phase  
**Authority:** **PRIMARY** for all presence/map/native geography decisions  
**Supersedes:** Informal “add GPS / add heat” framing in older roadmaps  
**Related:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) · [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) · [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) · [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) · [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)

---

## 1. What the PWA fundamentally IS

The production PWA is **not** a motion-tracking or confidence engine. It is:

| Stage | Mechanism |
|-------|-----------|
| Input | GPS coordinate **snapshots** (map `watchPosition`, shell 12s ping) |
| Geometry | Haversine distance to venue centers |
| State | Venue zone FSM (`outside` → `inner_pending` → `inner_confirmed` after 60s) |
| Time | Freshness windows on `user_presence.updated_at` |
| Output | UI interpretation: inside, nearby, live, recent, online, ghost, heat counts |

**That is the actual machine.**

---

## 2. What the PWA is NOT

The PWA today does **not** have:

| Missing capability | Implication |
|--------------------|-------------|
| Motion engine | No path continuity |
| Velocity prediction | No “where they’re heading” |
| Adaptive polling (presence) | Fixed 3s / 12s / 45s intervals |
| Heading interpretation | No bearing-aware UI |
| Accelerometer logic | No motion class |
| Native geofencing | No OS-level zone triggers |
| Background location ownership | Web suspends; no true background track |
| Motion classification | walking / vehicle / stationary |
| Kalman filtering | Raw fixes drive FSM |
| Path reconstruction | No trail history |
| Confidence scoring | **Recent coord ≈ likely valid** (implicit) |
| Movement continuity systems | Marker lerp is cosmetic, not truth |

Native may **eventually** own all five precision layers ([TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md)).  
Native must **not** pretend they exist before they do.

---

## 3. The two questions (critical distinction)

| Question | PWA answers today | Native aspiration |
|----------|-------------------|-------------------|
| **“Where were you recently?”** | Yes — snapshots + windows | Same semantics first |
| **“Where are you continuously and confidently?”** | No — not with integrity | Confidence architecture later |

**Product copy must never imply the second until L2 confidence supports it.**

Examples of **false second-question implication**:

- Pulsing “live” marker on a 19-minute-old row without “Away” tier copy
- Heat glow at a venue from one jittery fix bouncing inner/outer
- Smooth marker glide across blocks while zone FSM still says `outside`
- “12 people here” when counts include stale or fallback coordinates

---

## 4. Why the PWA still feels good

The system-truth audit proved: **the product is not raw GPS.**

Real product semantics:

- inside / nearby
- live / recent / online (distinct windows)
- ghost
- venue energy (`combined_count`)
- social density rules
- checkpoint ordering
- story activity
- visibility / block / hidden filters

**That is Intencity.** GPS is only fuel.

Therefore:

- Native **execution** may evolve (smoother, faster, smarter acquisition).
- Native **semantic truth** must stay stable unless intentionally redesigned with product sign-off.

---

## 5. Presence confidence (architecture only)

### 5.1 Definition

**Presence confidence** = how certain the system is that a user’s **semantic placement** (L1) is correct — separate from how pretty the map looks (L3).

Today PWA mostly assumes:

```
recent coordinate + passed filters ≈ valid for display/write
```

Native evolution target (not implemented):

```
confidence = f(
  GPS quality,
  movement continuity,
  velocity realism,
  heading stability,
  foreground/background freshness,
  dwell time in zone,
  motion classification,
  sensor agreement,
  jitter suppression,
  transition integrity
)
```

**Snapchat-level trust** comes from this stack — **not** from raw GPS alone.

### 5.2 Semantic certainty vs visual certainty

| Type | What it is | Rule |
|------|------------|------|
| **Semantic certainty** | DB + FSM + windows say `inner_confirmed` at venue X | Drives writes, notifications, copy |
| **Visual certainty** | Marker position, glow, heat, pulse | **Must never exceed** semantic certainty |

**Permanent rule:** UI must **never** imply more confidence than the system has.

| UI element | Must be tied to |
|------------|-----------------|
| “At {venue}” (online) | `isFriendOnlineNow` (4m) + zone/copy rules |
| Heat glow | `getCountsForVenue` + `isPresenceLive` (20m) |
| Checkpoint pulse strong | `combined_count` ≥ 16 |
| Smooth marker | Display only; optional hide if confidence low |
| Sheet density | Real counts or honest `—` |

### 5.3 Confidence inputs (future model)

| Input | Role |
|-------|------|
| GPS accuracy radius | Down-weight poor fixes |
| Time since last fix | Degrade foreground/background |
| Distance jump vs velocity | Suppress teleport writes |
| Dwell in inner zone | Support `inner_confirmed` |
| Agreement with zone FSM | Reject oscillating inner/outer |
| Ghost / hidden / block | Zero social confidence |
| Fallback coord detection | Zero map confidence |

### 5.4 Degradation ladder

When confidence drops, **degrade in this order** (architecture):

1. Stop **writing** zone transitions (L2)
2. Stop **notifications** (friend nearby, joined venue)
3. Reduce **visual** emphasis (pulse, heat weight) — L3
4. Widen copy to **recent** / **away** tiers — L1 labels only, not fake live
5. **Hide** marker (fallback coords, stale) — L3
6. Show **honest empty** — never invent

### 5.5 Transition integrity

Zone changes must not flicker from single bad fixes:

- PWA: `INNER_CONFIRM_MS` (60s) before `inner_confirmed` — **CANON**
- Native: must **preserve** this semantics; may add confidence gate **before** pending state

### 5.6 Jitter suppression philosophy

- **Writes:** require sustained inner presence or confidence threshold — not one ping inside radius
- **Visuals:** may smooth position while semantic state remains `outside` or `nearby` — **do not** upgrade copy to “At venue” from smooth marker alone

### 5.7 Dwell verification philosophy

`inner_confirmed` is the PWA’s dwell proxy. Future native may add explicit dwell scoring — **must map to same L1 labels** or product must approve new vocabulary.

### 5.8 Background freshness philosophy

- Web: no true background engine; shell 12s ping when not on map
- Native: background policy is **P2O-D+** with privacy review — throttled writes, never higher visual certainty than semantic state

---

## 6. Visual honesty rules (permanent)

| Rule | PWA status |
|------|------------|
| No fake heat | ✅ heat tied to counts; native ❌ no heat yet |
| No stale live badges | ✅ tiered copy; native ⚠️ “Nearby” drift |
| No teleporting markers | ⚠️ lerp can look continuous while DB jumps — native must cap |
| No fake density | ✅ sheet honest stubs on native |
| No exaggerated activity | ✅ pulse thresholds 9/16 |
| No dishonest interpolation | ⚠️ risk if marker smooth ≠ zone |
| Graceful degradation | ✅ deny GPS → last fix; ghost copy |
| Confidence-aware transitions | ❌ not yet — native opportunity |
| Honest empty states | ✅ Core Feel Lock direction |

---

## 7. Biggest product risk

Introducing **before confidence architecture exists**:

- Heat / glow layers
- Live markers with pulse
- Realtime density updates
- Animated “alive city” energy
- Aggressive auto-tour on unstable counts

**Failure modes:**

- Counts feel fake
- Markers jitter
- People teleport
- Venue transitions misfire
- **Trust collapses**

Social geography products **live or die on trust.**

**Gate:** MAP-C / “alive city” visuals require **P2O-C semantic validation parity** + visual honesty review — see [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md).

---

## 8. Presence authority migration

| Phase | Old framing | Trust-first framing |
|-------|---------------|---------------------|
| Today | Web writes `user_presence` | Single writer — **CANON** |
| P2O-D | “Turn on native writes” | **Era 2 Cutover** — presence authority migration; web → overview only |

Rules ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)):

- Exactly one writer per session
- No dual notifications from web + mobile
- `presence_source` metadata (UNK U3) for beta cohorts

Native writes without retiring web = **trust catastrophe**.

---

## 9. What native may do when (summary)

| Capability | Minimum gate |
|------------|--------------|
| Foreground GPS | VP-2 + P2O-B trust review |
| Read `user_presence` | P2O-C semantic parity |
| Friend markers | P2O-C + L3 honesty |
| Heat / glow / flow | P2O-C stable + confidence doc reviewed |
| Native writes | P2O-D authority migration |
| Background / prediction | MAP-D + privacy — post-confidence |

---

## 10. Cross-links

| Document | Use when |
|----------|----------|
| [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) | Classifying any change by L0–L5 |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | Exact PWA behavior today |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | Phased native plan |
| [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) | Known doc/code mismatches |
| [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) | Doc authority when docs conflict |

---

*Architecture lock — implementation resumes only after doctrine review and governance alignment.*
