# MAP-C slice 2 — atmosphere, tour, district flow, night chrome

Native map tab parity for PWA `apps/web/src/app/map/page.tsx` deferred items from [MAP_C_SLICE1.md](./MAP_C_SLICE1.md).

## Shipped

| Feature | Native |
|---------|--------|
| **Globe + fog** | `projection="globe"` + Mapbox `Atmosphere` (day/night fog + night stars) |
| **Brand tint** | Subtle `#3B66FF` overlay on map canvas |
| **Auto-tour** | Idle 20s → hop every 4s; pause 2.2s on pan/locate/select; arrow grace 2.2s |
| **Checkpoint fly** | `flyToCheckpoint` with PWA dynamic zoom formula |
| **Arrival pulse** | `checkpoint_pulse` 0→1 over 1600ms on glow layers |
| **District flow** | `districtFlowTrails` edges + glow/core line layers (hidden zoom ≥ 14.2) |
| **Night chrome** | Checkpoint bar + venue sheet tokens via `mapChromeForMode` |

## Constants (PWA)

- `AUTO_TOUR_PAUSE_MS` = 2200
- `AUTO_TOUR_IDLE_GRACE_MS` = 20000
- `AUTO_TOUR_REPEAT_MS` = 4000
- `CHECKPOINT_ARRIVAL_PULSE_MS` = 1600

## Camera motion parity (`mapCameraMotion.ts`)

All imperative moves use PWA `easeTo` parameters:

| Move | Zoom | Pitch | Duration | Guard |
|------|------|-------|----------|-------|
| Initial GPS center | unchanged | unchanged | 800ms | 1200ms |
| Locate tap 1 | `max(15.5, current)` | 0 | 520ms | 700ms |
| Locate tap 2 | 1.65 | 0 | 760ms | 900ms |
| Checkpoint / auto-tour | dynamic 15.75–17.05 | **40** | 1000–2600ms | 2200+dur+120 |
| Deep link venue | `max(current, 15.8)` | unchanged | 950ms | 1100ms |

Web uses `easing: (t) => t * (2 - t)`; native `animationMode: "easeTo"` (closest GL native easing).

## Regression fix (2026-05-20)

Slice 2 accidentally remounted `Camera` on every auto-tour hop because `selectedVenueId` included `activeCheckpoint.id` in the camera key. That reset bounds/zoom and hid heat/glow. Fixes:

- `highlightVenueId` for pin selection only; `freezeDeclarativeCamera` after first center
- `pitchEnabled` + `pitch: 40` on checkpoint fly (PWA angled view)
- Removed `onRegionIsChanging` zoom handler (was pausing tour every frame)
- Checkpoint bar shows `• X mi` / `• locating...` (PWA AFK/tour chrome)
- Removed full-screen brand tint overlay (washed out heat colors)

## Polish (see [MAP_C_POLISH.md](./MAP_C_POLISH.md)) ✅

| Item | Status |
|------|--------|
| Branded basemap layer paint | ✅ `MapBrandedBasemapLayers` |
| District flow `line-dashoffset` animation | ✅ 96ms tick |
| Marker position smoothing | ✅ rAF lerp |
| Auto-tour user setting | ✅ SecureStore |

## Still deferred

| Item | Phase |
|------|--------|
| P2O-D presence writes | P2O-D |
| Ghost toggle write on map pill | P2O-D |
| Marker outer `boxShadow` bloom (perf) | Optional EXE |

## Test

1. Dev client at night (after 18:00 local): navy basemap, stars in fog, white checkpoint/sheet chrome.
2. Leave map idle 20s with ≥2 venues: camera hops checkpoints every ~4s; glow pulse on arrival.
3. Pan map: idle timer resets; tour pauses ~2.2s.
4. Friends moving between venues: curved indigo trails at city zoom; trails fade by 18s.
5. Zoom past 14.2: district flow hidden; heat/glow remain.
