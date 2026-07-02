# MAP-C polish — motion parity (complete)

**Date:** 2026-05-20  
**Gate:** MAP-B/C core complete before venue sheet / live places slices

## Shipped

| Feature | PWA | Native |
|---------|-----|--------|
| **Friend marker lerp** | `PRESENCE_MARKER_SMOOTH_ALPHA` 0.18, rAF tick, snap 0.012° | `presenceMarkerMotion.ts` + `MapSmoothPresenceMarker` |
| **You GPS dot lerp** | Same smooth store for you marker | `MapSmoothYouDot` (`you-gps` id) |
| **District flow dash march** | 96ms `line-dashoffset` on glow/core | `districtFlowDashoffset.ts` + animated line styles |
| **Branded basemap** | `applyBrandedBasemapTheme` | `MapBrandedBasemapLayers` (`existing` layers) |
| **Last-seen under avatar** | `formatLastSeen` tag | `MapPresenceAvatarMarker` + `formatMapLastSeen` |
| **Auto-tour setting** | `localStorage` | SecureStore + Settings toggle |

## Constants (PWA)

- `PRESENCE_MARKER_SMOOTH_ALPHA` = 0.18
- `PRESENCE_MARKER_SNAP_DEG` = 0.012
- District dash: `off = -((t * 0.85) % 1.6) * 7`, core × 1.12, interval 96ms

## Test

1. Friend moves on PWA → native avatar **glides** (no teleport unless hop > snap threshold).
2. City zoom with district trails → dashed lines **march** (not static dashes).
3. Idle friend pin → last-seen label under avatar.
4. Settings → Auto venue tour off → map idle tour stops after tab refocus.

## Next (post-map)

1. **Venue sheet + `/venue-detail` / `/venue-activity`**
2. **Live Places tab** + REALTIME-1
3. **`P2O-D`** presence writes — **Era 2 only** ([PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md))
