# Era 3 — Native Evolve (live geography precision)

**Status:** **Current era** — resequenced **2026-06-05**  
**Authority:** [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) · [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) · [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md)

---

## Product north star

> **Show where your area is live** — friends on the map, venue energy (heat + glow), honest inside/nearby counts — so you can decide *where to go tonight* without guessing.

Native Evolve makes that **feel instantaneous and trustworthy** on a phone. **Semantic meaning** (what “live”, “inside”, “nearby” mean) stays locked to PWA + `@intencity/shared` until **Era 5 (`P2O-D`)** owns writes.

---

## Era order (resequenced)

| Era | Name | Native focus |
|-----|------|----------------|
| **1** | Mirror | ✅ Signed off — read/display parity |
| **2** | Notifications | ✅ NOTIF-1/2/3/4 — web still writes presence |
| **3** | **Evolve** | **← NOW** — precision acquisition, smooth live map, faster reads |
| **4** | Web cutover | Optional — marketing-only web |
| **5** | Presence authority | **`P2O-D` last** — native sole `user_presence` writer |

---

## Complete presence logic (PWA DNA — all scenarios)

This is the **full behavioral machine** native must respect until Era 5. GPS is fuel; zones + windows + visibility rules are the product.

### The pipeline (every 12s on web, on coords change on map)

```
GPS fix (lat, lng)
  → computePresenceFromGps (zones + FSM)
  → upsert user_presence (venue_id, zone_type, venue_state, entered_inner_at)
  → notifications on transitions
  → readers apply freshness windows + distance rules for heat / markers / copy
```

**Two parallel truths** (do not confuse):

| Layer | What it uses | Purpose |
|-------|----------------|---------|
| **Write FSM** | `zone_type`, `venue_state`, `entered_inner_at` | DB row, district-flow anchors, joined-venue notifs |
| **Display counts** | Raw **distance** to venue center + `updated_at` windows | Heat, glow, sheet inside/nearby totals |

Heat does **not** wait for `inner_confirmed`. If your coords are inside `inner_radius_m` and row is live (≤20m), you count as **inside** immediately.

### Venue zones (concentric, best-match wins)

Per venue, distance from your fix to venue center:

| Zone | Typical radius | `zone_type` | Heat (`getCountsForVenue`) | Social copy (`venue_id` set) |
|------|----------------|-------------|----------------------------|------------------------------|
| **Inner** | ~80m (`inner_radius_m`) | `inner` | **Inside** (red) | Yes — “At {venue}” if online |
| **Outer** | ~200m (`outer_radius_m`) | `outer` | **Nearby** (green) | Yes |
| **Halo** | ~270m (`haloLimitM` ≈ outer×1.35) | `halo` | **No** (too far for outer) | Yes — can show “At {venue}” from `venue_id` |
| **Outside** | beyond halo | `null` / cleared | No | No |

If multiple venues overlap, **closest** in each tier wins (inner beats outer beats halo).

### FSM — dwell vs walk-through

| State | When | Meaning |
|-------|------|---------|
| `outside` | Not in inner zone | Default |
| `inner_pending` | Enter inner | Started dwell timer |
| `inner_confirmed` | Inner ≥ **60s** (`INNER_CONFIRM_MS`) | “Really inside” for district-flow anchors |

Leaving inner → immediately `outside`, timer cleared.

**Walking past (drive-by):**

- Through **outer** only: brief `venue_id`, nearby heat blip if row stays live, `friend_joined_venue` on **new** venue entry (inner or outer).
- Through **inner** without 60s: `inner_pending`; heat still counts you **inside** by distance; district-flow may not anchor until `inner_confirmed` or `zone_type === inner`.
- Through **halo** only: `venue_id` attached, **no** heat, **no** `friend_joined_venue` (requires inner/outer), **no** `friend_nearby` (see below).

### Living near a venue (residential / campus edge)

| Where you live (GPS) | What friends see | Heat impact | Notifications |
|----------------------|------------------|-------------|---------------|
| **Inside inner** | Avatar in venue stack or inside count | Persistent inside if pings stay live | Joined venue on first attach |
| **In outer ring** | Nearby count + “At/Away · At” copy | Persistent **nearby** energy | Joined venue on entry |
| **In halo only** | Copy may say “At {venue}” (from `venue_id`) | **None** — privacy-friendly soft link | No joined-venue; **blocks** friend_nearby |
| **Outside all rings** | Map marker only | None | friend_nearby if within **300m** and **no** `venue_id` |

**PWA quirk (CANON):** Halo sets `venue_id` so subtitles can reference a venue, but heat uses distance only — neighbors in halo don’t inflate glow. Outer-ring residents **do** inflate nearby counts (known limitation until confidence layer).

### Freshness windows (never collapse)

| Window | Duration | Drives |
|--------|----------|--------|
| **Online now** | 4m | Pulse ring, hub active strip, “At {venue}” headline |
| **Live** | 20m | Heat eligibility, map markers, checkpoint activity |
| **Recent** | 60m | Sheet people chips, “Recently at …” |
| **Stale** | >60m | Hidden from map / heat; “Offline” |

Friend **online** (4m) ≠ venue **live** (20m). Someone can be “Away · At X” (live, not online).

### Heat & checkpoint sort

`combined_count = inside + nearby` per venue:

1. Row must be `isPresenceLive` (≤20m)
2. Skip self, ghost, invalid coords, blocked
3. Friends: count if within **outer**
4. Non-friends: only if within **outer** (must be physically near to appear in energy)
5. Steps at **1 / 4 / 9 / 16** for color + glow intensity

Checkpoints: sort **`activity` (combined) desc**, then **distance from you** asc.

### Friend map markers vs venue stacks

- **Not in any venue outer ring:** freestanding avatar marker (live friends only).
- **Inside venue outer:** stacked at **venue pin** (up to 3 visible avatars).
- **You on native (EVOLVE-1):** local device puck when not in a venue stack; friends stay on DB coords + interpolation.

### Notifications (web write path today)

| Type | Trigger | Deduped |
|------|---------|---------|
| `friend_online` | Was not online (4m), now pinging | Hour bucket |
| `friend_joined_venue` | New `venue_id` + zone **inner or outer** | Day bucket |
| `friend_nearby` | Crossed into **300m**, both live, friend has **no** `venue_id` | Hour bucket |

**Critical:** Any `venue_id` (including **halo**) suppresses `friend_nearby`. Walking alone on the street → nearby alerts; soft-associated with a venue → no nearby spam.

### Ghost mode

Coords may persist for self; `venue_id` cleared; friends don’t see marker; copy “Hiding location”.

### What native reads today vs what still comes from web writes

| Data | Native today | Until Era 5 |
|------|--------------|-------------|
| Friend coords / `venue_id` | `user_presence` poll 45s + realtime | Web 12s / map-on-change writes |
| Your map puck | Device GPS (EVOLVE-1) | Local only |
| Your venue pill / AtVenue | Device geofence preview + DB row | DB lags up to 12s |
| Heat / glow | Recomputed from polled presence | Same semantics, fresher in EVOLVE-2 |

---

## PWA behavioral DNA (what we inherit)

### Time windows (`packages/shared`)

| Constant | Value | Used for |
|----------|-------|----------|
| `FRIEND_ONLINE_BADGE_MS` | **4 min** | Friend “Online now”, pulse ring, hub active-friend strip |
| `MAP_ACTIVITY_WINDOW_MS` | **20 min** | Venue heat, glow, `combined_count`, checkpoint sort, “live” map participation |
| `RECENT_WINDOW_MS` | **60 min** | “Recently at …” copy after live window |
| `INNER_CONFIRM_MS` | **60 s** | Must dwell in venue **inner** zone before `inner_confirmed` |
| `NEARBY_THRESHOLD_M` | **300 m** | Friend-nearby notification when crossing into range |

**Critical split:** friend **online** (4m) is **stricter** than venue **live** (20m). Do not collapse these on native.

### Venue zones (per venue row)

From GPS + `computePresenceFromGps` (`@intencity/shared`):

| Zone | Radius | Meaning |
|------|--------|---------|
| **inner** | `inner_radius_m` (~80m default) | “Inside” — counts toward red / inside_total |
| **outer** | `outer_radius_m` (~200m) | “Nearby” — counts toward green / nearby_total |
| **halo** | `halo_radius_m` | Soft association — sets `venue_id` but not inside/nearby counts |

**State machine:** `outside` → `inner_pending` (on inner entry) → `inner_confirmed` (after 60s) → `outside` (on leave).

### Who counts toward venue heat (`getCountsForVenue`)

For each `user_presence` row at a venue:

1. Skip self, ghost users, invalid coords, **non-live** rows (`>20m` stale)
2. **Friends** always eligible if within **outer** radius
3. **Non-friends** only if within **outer** radius (privacy: must be physically near venue)
4. **Inside** = distance ≤ `inner_radius_m` → `inside_count` (red)
5. **Nearby** = inner < distance ≤ `outer_radius_m` → `nearby_count` (green)
6. **`combined_count`** = inside + nearby → drives heatmap color steps **1 / 4 / 9 / 16**

### PWA write path (still production today)

| Surface | Behavior |
|---------|----------|
| **`AppShell`** | `getCurrentPosition` every **12s** on any route → `syncUserPresenceWithVenuesFromCoords` |
| **`/map`** | Also syncs when `you` coords change |
| **Ghost mode** | Coords saved, `venue_id` cleared — friends don’t see you on map |
| **Notifications** | `friend_online`, `friend_joined_venue`, `friend_nearby` fired on transitions (deduped per hour/day) |

### PWA read / display path

| Surface | Behavior |
|---------|----------|
| **Map heat** | Mapbox heatmap layer — weight from `combined_count`, breathe animation |
| **Venue glow** | Circle layers — color steps ice → teal → pink → blue by count |
| **Friend markers** | Live friends only (`isPresenceLive` + valid coords + not ghost) |
| **Checkpoints** | Sort venues by `activity` (combined count) then distance from you |
| **Venue sheet** | Inside / nearby friend chips + totals |
| **Hub active friends** | `isFriendOnlineNow` (4m window) |

---

## PWA limits (why native can be better *before* Era 5)

| Limitation | PWA reality | Native opportunity (Era 3) |
|------------|-------------|----------------------------|
| GPS cadence | 12s shell ping, browser throttling | Foreground watch 2–5s on Map focus; accuracy + speed filters |
| Background | Tab sleep → stale `user_presence` | OS background location *read* for local puck (writes still Era 5) |
| Marker motion | Jumpy 12s updates | L4 interpolation between server ticks — **without** upgrading “live” semantics |
| Heat freshness | Poll/subscription latency | Faster `user_presence` realtime on map tab; optimistic local “you” layer |
| Venue confirm | 60s inner dwell | Same FSM — but native can use higher-frequency local GPS for *your* puck preview |
| Dual surface | Web writes, native reads | Era 3 improves **display**; Era 5 improves **truth propagation** |

---

## Era 3 implementation slices (strict order)

### EVOLVE-1 — Acquisition precision (no writes)

**Layer 1** — trustworthy fixes on device.

- Reject fixes with `accuracy > N` m (walking campus)
- Reject stale / cached fixes when speed implies teleport
- Map-tab high-accuracy foreground watch; shell routes lower duty cycle
- **Local “you” puck** from device GPS — does **not** upsert `user_presence`
- Permission-denied honesty (no Philly fallback puck)

**Gate:** No `user_presence` write. Uses existing `P2O-B` path.

### EVOLVE-2 — Live map refresh + interpolation **(NEXT — detailed)**

**Status:** Ready after EVOLVE-1 ✅  
**Layers:** 3 (confidence display) + 4 (visual interpolation)  
**Still no** `user_presence` writes.

#### Problem today

| Gap | PWA | Native now |
|-----|-----|------------|
| Map presence poll | **3s** on `/map` | **45s** global `PresenceProvider` poll |
| Map realtime | Poll-only (no channel on map page) | Realtime exists but heat/markers don’t boost on map focus |
| Friend marker motion | α=0.18 smooth, 12s write cadence | Interpolation exists; targets update only on 45s poll + sparse realtime |
| Heat refresh | Rebuilds on 3s poll | Rebuilds on poll clock — feels “stale” when friend moves block to block |
| UI clock | 15s `presenceUiTick` | 30s `presenceClock` |

Friends can be **2–15 blocks ahead** of glow on native while web testers on PWA see fresher energy.

#### Deliverables (ordered)

**EVOLVE-2a — Map-scoped presence refresh**

- New `useMapPresenceRefresh` (or extend map tab): when map focused:
  - Quiet poll every **3s** (match PWA `§1.8`)
  - Keep global realtime channel; merge into map-local presence slice OR call `reloadPresence` with debounce
  - `presenceClock` tick **15s** on map (match PWA re-render for online/live tier transitions)
- On blur: fall back to hub 45s poll (battery)

**EVOLVE-2b — Heat/glow reactive rebuild**

- `venueActivityGeoJson` + glow layers recompute on:
  - Every map presence merge (not only `presenceClock`)
  - INSERT/UPDATE on `user_presence` while map focused
- Checkpoint bar re-sorts on same trigger (activity → distance unchanged)

**EVOLVE-2c — Friend marker interpolation tuning**

- Wire `setPresenceMarkerTarget` on every presence row change (not only marker list identity change)
- Snap threshold stays `PRESENCE_MARKER_SNAP_DEG` (~1.3km) for teleports
- **Exclude local you puck** from motion store (already separate in EVOLVE-1)
- Optional: velocity-aware α — slower lerp when implied speed > walking pace (display only; no semantic “live” change)

**EVOLVE-2d — Parity fixtures**

- Shared test vectors: walk-through outer, halo resident, inner 60s confirm, ghost, blocked non-friend
- Assert `getCountsForVenue` + checkpoint order + sheet people match PWA fixture JSON

#### Files (expected touch)

| File | Change |
|------|--------|
| `apps/mobile/app/(app)/(tabs)/map.tsx` | Map-focused refresh hook, faster clock |
| `apps/mobile/src/hooks/useMapPresenceRefresh.ts` | **New** — 3s poll + focus gating |
| `apps/mobile/src/hooks/useUserPresenceState.ts` | Optional split: global vs map-fast path |
| `apps/mobile/src/components/VenuesMapCanvas.tsx` | Re-tick heat on presence prop change |
| `apps/mobile/src/lib/presenceMarkerMotion.ts` | Target updates + optional velocity cap |
| `packages/shared` or `apps/mobile/src/lib/__fixtures__` | Parity fixture tests |

#### Acceptance gates

- [ ] Map focused: friend moves → marker glides within 3s; heat step updates within 3s
- [ ] Map blurred: poll returns to 45s (no 3s drain in hub/chat)
- [ ] `isPresenceLive` / `isFriendOnlineNow` / zone FSM **unchanged**
- [ ] Walking-past-halo fixture: **zero** heat; outer fixture: nearby only
- [ ] No `user_presence` upsert from native

#### Why this is better on native (before Era 5)

Execution gets PWA-grade **freshness** without waiting for write authority. Interpolation fills the gap between 3s reads so the map **feels** continuous; web never had smooth markers at 3s poll — native can **look better than PWA** while still reading the same DB truth.

---

### EVOLVE-3 — MAP-D lite (summarized)

**Layer 2** — movement interpretation for **you** and **display hints only**.

| Change | Why native wins |
|--------|-----------------|
| Run `computePresenceFromGps` locally on device GPS at 2s (preview only) | Your “At venue” pill updates **before** 12s web write; matches walk-through vs dwell |
| Dwell detector: stationary + inner → UI shows pending vs confirmed hint | Reduces “I’m inside but pill says not yet” distrust |
| Velocity cap on marker animation | Stops subway/WiFi teleport glides |
| Geofence **hints** (iOS/Android region monitor) wake map refresh near saved venues | OS-level “approaching campus bar row” without background writes |

**Gate:** FSM output must match `computePresenceFromGps` before any label change; product sign-off for new copy.

**Not in EVOLVE-3:** Changing heat rules, collapsing windows, or writing `user_presence`.

---

### EVOLVE-4 — Background read policy (summarized)

| Change | Why native wins |
|--------|-----------------|
| Significant-location / infrequent background **read** | Hub badge + “friends live” less stale when app backgrounded |
| Adaptive duty cycle: high on map, low elsewhere | Battery vs PWA tab-kill |
| Optional: push wake on `user_presence` realtime (already have NOTIF-4) | Delivery without opening map |

**Still no writes.** Only refreshes read model + local puck cache.

---

### Era 5 — P2O-D (summarized — when Evolve is done)

| Change | Why it matters |
|--------|----------------|
| Native `syncUserPresenceWithVenuesFromCoords` at **2–5s** | Friends/heat/notifications propagate at phone cadence — **truth** catches up to EVOLVE display |
| Retire web 12s ping for native cohort | Single writer; no dual-write |
| `friend_joined_venue` / `friend_nearby` on native | Notifications align with faster GPS |
| Walking-past logic **live** on device | Halo vs outer vs inner transitions fire in real time, not 12s late |
| Living-near-halo: still no heat inflation | FSM unchanged; execution finally instant |

**Gate:** [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) — rollback, `presence_source` cohort, no casual dual-write.

### EVOLVE-3 — MAP-D lite (client intelligence, no semantic drift)

**Layer 2** — movement interpretation for **display hints only**.

- Dwell detection → “likely still here” UI hint (copy: “Recently active here” only if within 20m window)
- Velocity cap → suppress marker teleport animations
- Optional: geofence **hints** for faster local zone preview (FSM output must match `computePresenceFromGps` before Era 5 writes)

**Gate:** Product sign-off if any new user-facing label.

### EVOLVE-4 — Background read policy (pre–P2O-D)

**Layer 5** — battery-aware **read** refresh when app backgrounded.

- Significant-location or infrequent background read **for map badge freshness only**
- Still **no** `user_presence` upsert until Era 5

---

## Era 5 reminder (`P2O-D` — not Era 3)

When Evolve is stable:

- Port `syncUserPresenceWithVenuesFromCoords` to native
- Retire web 12s ping for native cohort
- Native drives `friend_online` / venue / nearby notifications
- Higher write cadence (2–5s) becomes **truth**, not just display

See [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md).

---

## Slice status

| Slice | Status |
|-------|--------|
| **EVOLVE-1** | ✅ Shipped — accuracy filter, map-focus watch, local you puck |
| **EVOLVE-2** | **Next** — map 3s refresh, heat reactive rebuild, marker tuning |
| **EVOLVE-3** | Planned — local FSM preview, dwell/velocity hints |
| **EVOLVE-4** | Planned — background read policy |
| **Era 5 P2O-D** | Deferred — native writes + notifications |

---

*Semantics from PWA. Execution from the phone. Writes last.*
