# MAP-B slice 1 — friend presence markers on map

**Date:** 2026-05-18  
**Gate:** P2O-C read validation · **no** new `.from()` targets · **no** presence writes

## Shipped

| Piece | Path |
|-------|------|
| Marker visibility rules | `src/lib/mapPresenceMarkers.ts` (PWA parity) |
| Avatar pin | `src/components/map/MapPresenceAvatarMarker.tsx` |
| Venue avatar stack | `src/components/map/MapVenuePresenceCluster.tsx` |
| Map wiring | `VenuesMapCanvas.tsx`, `app/(app)/(tabs)/map.tsx` |

## PWA parity (this slice)

| PWA | Native |
|-----|--------|
| Friend avatar pins (not in venue) | `MapPresenceAvatarMarker` + green/blue/slate glow |
| You at device GPS | Avatar at `youCoords` when presence row missing |
| Venue stack (≤3 faces) | `MapVenuePresenceCluster` on category pin |
| Hide at globe zoom (<8) | `onCameraChanged` zoom gate |
| Fallback Philly filter | `isLikelyMapFallbackPresence` |
| Ghost friends hidden | `ghostByUserId` |
| Marker smooth lerp | `presenceMarkerMotion.ts` + `MapSmoothPresenceMarker` (α 0.18) |
| Tap → profile | `/profile` (you) · `/u/[username]` (friend) |

## Device QA

1. Friend live on PWA → avatar on native map near their coords (zoom ≥ 8).
2. Friend **inside** venue outer radius → stack on venue pin, not floating pin.
3. You → avatar (not blue dot) when GPS + avatar available.
4. Zoom way out (<8) → markers hide.
5. Tap friend pin → profile route.

## Next: MAP-C

Heat, glow, checkpoint pulse, auto-tour.
