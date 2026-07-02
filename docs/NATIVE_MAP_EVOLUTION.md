# Native map evolution — technical layer roadmap

**Date:** 2026-05-18 (reframed through trust doctrine)  
**Status:** **SECONDARY** technical reference — **PRIMARY** phase intent is [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)  
**Doctrine:** [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) · [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md)  
**Semantic authority:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) + [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md)  
**Current native:** [`apps/mobile/app/(app)/(tabs)/map.tsx`](../apps/mobile/app/(app)/(tabs)/map.tsx) — **MAP PHASE A** complete (shell)

> **⚠️ Terminology update:** “Alive city” (old MAP PHASE C) is renamed **confidence visualization** — heat/glow/auto-tour must not ship before [P2O-C semantic validation parity](./NATIVE_PRESENCE_EVOLUTION.md#p2o-c--semantic-validation-parity). See [PRESENCE_TRUST_ARCHITECTURE.md §7](./PRESENCE_TRUST_ARCHITECTURE.md).

---

## 0. Five-layer precision model (read first)

Native map work advances one or more layers — not “better GPS” alone:

1. Location acquisition · 2. Movement interpretation · 3. Presence confidence · 4. Visual interpolation · 5. Battery/background

PWA has **partial 1 + partial 3** only. Do not implement layer 4–5 spectacle before layer 3 honesty.

---

## 1. Principles

| Rule | Detail |
|------|--------|
| **Semantics match PWA** | User-visible meaning of inside/nearby, ghost, checkpoints, filters — same tables and constants (L1) |
| **Native may exceed PWA technically** | Smoother markers, better battery policy, native GL layers — **not** different product rules |
| **Phased delivery (trust-first)** | Shell → trustworthy location → semantic read parity → confidence visualization → authority migration → intelligence |
| **No premature features** | No heat, live markers, or animated city energy before confidence architecture |

---

## 2. What stays identical (semantic CANON)

From `packages/shared` + PWA implementation — native must not reinterpret:

| Concept | Source | Native must match |
|---------|--------|-------------------|
| Online badge window | `FRIEND_ONLINE_BADGE_MS` (4 min) | Hub “online” / profile labels |
| Map live window | `MAP_ACTIVITY_WINDOW_MS` (20 min) | Heat eligibility, “live” tier |
| Recent window | `RECENT_WINDOW_MS` (60 min) | “Recently at” copy |
| Nearby threshold | `NEARBY_THRESHOLD_M` (300 m) | Friend-nearby notifications |
| Ghost mode | `profiles.ghost_mode` | Suppresses writes / visibility per PWA |
| Checkpoint semantics | Activity sort, then distance | Order of auto-tour targets |
| No fake GPS | Keep last real fix on deny | No invented user location |
| Poll intervals | Map 3s presence, hub 45s, etc. | Documented in SYSTEM_TRUTH — tune only with audit |

---

## 3. What improves on native (execution, not semantics)

| Area | PWA constraint | Native opportunity |
|------|----------------|-------------------|
| Marker rendering | DOM `mapboxgl.Marker` + CSS | Native GL layers / GPU heatmap |
| Camera motion | `easeTo` only | Native follow mode + interpolated camera |
| Battery | Web geolocation + 3s poll | Adaptive GPS: foreground high accuracy, background throttled |
| Sheet physics | CSS + wheel dismiss | Reanimated sheet + haptics |
| Offline / cache | Limited | Tile + venue catalog cache |
| Performance | Single-threaded heat tick | Native driver animations, layer batching |

---

## 4. What becomes realtime later (explicitly not Phase A)

| Capability | PWA today | Native phase |
|------------|-----------|----------------|
| `user_presence` read on map | 3s poll + postgres sub | **P2O-C** |
| `user_presence` write from GPS | Map + AppShell paths | **P2O-D** (gated) |
| Heatmap layer | `venue-heat` animated | **MAP PHASE C** |
| Glow / core circles | Activity-stepped colors | **MAP PHASE C** |
| District flow trails | Line layers + dash anim | **MAP PHASE C** |
| Friend DOM markers | Lerp + pulse | **MAP PHASE B** |
| Auto-tour | Idle 20s / step 4s | **MAP PHASE C** |
| Push on friend nearby | Web notifications | Later native push |

---

## 5. MAP PHASE A — parity shell (current native)

**Status: ✅ Shipped (`P2O-A` + Core Feel Lock polish)**

| Deliverable | Native state |
|-------------|--------------|
| Mapbox `MapView` (light) | ✅ |
| Category filter tray | ✅ |
| Category pins + labels | ✅ |
| Checkpoint bar (catalog order) | ✅ |
| Venue sheet UI | ✅ honest stubs |
| Friends list overlay (no map dots) | ✅ |
| Ghost display pill | ✅ read-only |
| Deep link `venueId` | ✅ |
| Locate = fit venue bounds | ✅ (not GPS) |
| Loading skeleton | ✅ Core Feel Lock |
| Expo Go fallback + copy | ✅ |

**Gaps vs PWA visuals (expected in A):** no heat, no night mode, no presence, no auto-tour.

---

## 6. MAP PHASE B — confidence visualization (friend markers)

**Trust name:** Confidence visualization — **not** “core realtime.”  
**Gate:** VP-2 sign-off + **P2O-B** + **P2O-C** semantic validation ([NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md))

| Workstream | Description |
|------------|-------------|
| Foreground GPS | `watchPosition` / equivalent; no fake coords |
| User puck | Mapbox location layer |
| Real Locate | Center on user; arm programmatic camera |
| Distance strings | Sheet + checkpoint subtitle |
| Native presence writes | Port `syncUserPresenceWithVenuesFromCoords` per SYSTEM_TRUTH |
| Friend markers | Read friends’ presence; smooth interpolation |
| Marker focus | Tap friend → `easeTo` / native camera |
| Ghost toggle write | Map pill updates `profiles.ghost_mode` |
| Adaptive GPS | Reduce accuracy when sheet open / app background |

### Movement smoothing (native advantage)

```
GPS fix (1–5 Hz) → Kalman / exponential smooth → marker lerp (60 fps) → map layer
```

- **Interpolation:** 150–250 ms alpha toward new lat/lng (match PWA `PRESENCE_MARKER_SMOOTH_ALPHA` intent)
- **Stale marker hide:** If `isLikelyMapFallbackPresence` — do not stack at default center

### Battery optimization

| State | GPS | Presence write | UI tick |
|-------|-----|----------------|---------|
| Map focused | High accuracy | On fix | 15s UI refresh |
| Map background | Paused / coarse | Throttle | Stop |
| Sheet open | Medium | On fix | Continue |

---

## 7. MAP PHASE C — confidence visualization (venue energy)

**Trust name:** Confidence visualization — **not** “alive city.”  
**Gate:** P2O-C semantic validation parity on device + visual honesty review ([PRESENCE_TRUST_ARCHITECTURE.md §6](./PRESENCE_TRUST_ARCHITECTURE.md))

| Layer | PWA reference | Native implementation |
|-------|---------------|------------------------|
| Heatmap | `venue-heat` + breathe interval | Mapbox `HeatmapLayer` or custom GL |
| Glow / core | `venue-glow`, `venue-core` | Circle layers sized by `combined_count` |
| District currents | `districtFlowTrails.ts` | Line layers + dash offset animation |
| Checkpoint sort | Activity then distance | Port PWA sort using live counts |
| Arrival pulse | `checkpoint_pulse` 1.6s | Native circle radius/opacity animation |
| Auto-tour | Idle 20s, step 4s | Timer + gesture pause 2.2s |
| Night / day basemap | Hourly style swap | `light-v11` / `dark-v11` + fog |
| Low-zoom clusters | Venue badges | Symbol layer cluster |
| Hub sheet live counts | Inside / nearby | Wire to same presence query |

### Atmosphere systems

| PWA | Native target |
|-----|---------------|
| Mapbox fog | `Atmosphere` API on Mapbox RN |
| Brand tint overlay | Optional color relief or post-process vignette (already have edge vignette) |
| Minimal basemap | Hide 3D buildings / clutter |

### Heatmap rendering notes

- Use same color ramp as `venueHeatColors` shared package
- Animate `heatmap-intensity` with sine (200 ms tick) — optional reduce frequency on battery saver
- Hide heat when zoom > 14.2 (match PWA district flow cutoff)

---

## 8. MAP PHASE D — intelligent city (future)

**Not scheduled in pre-presence foundation.** Product research required.

| Capability | Description |
|------------|-------------|
| Predictive movement | Short-horizon friend trajectory for smoother camera |
| Social routing | “Friends heading to X” suggestions |
| Venue confidence scoring | Weight presence by dwell time + confirm |
| Trend forecasting | Temporal city state (“heating up in 20m”) |
| Motion-state awareness | walking / vehicle / stationary — adjust UI |
| Intelligent checkpoint ordering | ML or heuristic beyond static sort |
| Recommendations | Next venue / friend meetup prompts |

### Technical enablers

- Historical presence aggregates (new tables — gated product decision)
- On-device buffer of recent fixes
- Server-side zone engine (optional; PWA is mostly client-side today)

---

## 9. Native capability matrix (analysis)

| Capability | PWA | Native Phase A | B | C | D |
|------------|-----|----------------|---|---|---|
| Static venue pins | ✓ | ✓ | ✓ | ✓ | ✓ |
| Category filter | ✓ | ✓ | ✓ | ✓ | ✓ |
| Venue sheet | ✓ | stub | ✓ live | ✓ live | enhanced |
| Heatmap | ✓ | — | — | ✓ | ✓+ |
| Friend on map | ✓ | — | ✓ | ✓ | predict |
| GPS puck | ✓ | — | ✓ | ✓ | ✓ |
| Background location | limited | — | opt | opt | smart |
| Realtime sub | ✓ | — | hybrid | ✓ | ✓ |
| Auto-tour | ✓ | — | — | ✓ | adaptive |
| Clustering | ✓ | — | — | ✓ | ✓ |

---

## 10. Architecture direction (no rewrite)

Keep current composition:

```
map.tsx (orchestrator)
  ├── VenuesMapCanvas (GL layers — grow here in C)
  ├── MapCategoryFilterTray
  ├── MapSecondaryControls
  ├── MapCheckpointBar
  ├── MapVenueSheet
  └── MapAtmosphereOverlay

hooks/
  ├── useVenuesPreview (existing)
  ├── useMapPresence (NEW in B/C — poll + subscribe)
  └── useMapCamera (NEW in B — user + programmatic)

lib/
  ├── venueCategoryAccent (existing)
  ├── userPresenceVenueSync (port from web in B)
  └── mapLayerIds.ts (NEW in C — layer order constants)
```

**Do not** port web’s 4k-line monolith — port **behaviors** into layers.

---

## 11. Precision & update frequency (target spec)

| Signal | Target update | Notes |
|--------|---------------|-------|
| GPS display | 1–4 Hz smoothed | Map foreground only |
| Presence write | On meaningful move (>25 m) or 30s heartbeat | Match web sync throttle |
| Presence read (map) | 3s poll + realtime event | Per SYSTEM_TRUTH |
| Heat layer | 5–10 Hz render, 200 ms data tick | Battery saver: 500 ms |
| Friend markers | 60 fps lerp | Decouple from poll |
| Hub active friends | 45s poll + sub | Separate from map |

---

## 12. Recommendation: when to start live map phase

| Milestone | Criterion |
|-----------|-----------|
| **Start P2O-B** | Core Feel Lock QA pass + VP-2 sign-off |
| **Start MAP PHASE B** | Same as P2O-B — location is the enabler |
| **Start MAP PHASE C** | P2O-C read path verified; sheet shows real inside/nearby on device |
| **Start MAP PHASE D** | Product spec + privacy review for prediction/background |

---

## 13. Related documents

- [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) — **PRIMARY** trust-first sequencing
- [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) — L0–L5 model
- [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) — confidence + honesty rules
- [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) — PWA behavioral DNA
- [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) — map/presence chapters
- [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) — known native gaps
- [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) — doc authority
- [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) — engineering gates

---

*Native map is intentionally a shell today. Phases B–C add **honest** energy; semantics stay fixed until product redesign.*
