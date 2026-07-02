# P2O-B slice 1 — foreground location on Map

**Date:** 2026-05-18  
**Gate:** VP-2 signed off · **no** `user_presence` writes (P2O-D)

## Shipped

| Piece | Path |
|-------|------|
| `expo-location` | `apps/mobile/package.json`, `app.config.ts` plugin |
| Foreground watch | `src/lib/nativeForegroundLocation.ts`, `src/hooks/useForegroundLocation.ts` |
| Locate priority | `src/lib/mapLocateTarget.ts` (sheet → you) |
| Map wiring | `app/(app)/(tabs)/map.tsx`, `VenuesMapCanvas.tsx` (`LocationPuck`, `locateCamera`) |

## PWA parity (this slice)

| PWA | Native |
|-----|--------|
| `watchPosition` on map | `Location.watchPositionAsync` while Map tab mounted |
| Never fake coords on deny | Keep last fix; no fallback injection |
| `runLocateCycle` sheet → you | `resolveMapLocateTarget` + two-tap zoom |
| Check-in / presence center | **Deferred P2O-C** |

## iOS crash fix (missing Info.plist keys)

If Map crashes with `NSLocation*UsageDescription`, the committed `ios/` folder was built before `expo-location`. Fix is in `ios/Intencity/Info.plist` + `app.config.ts` `ios.infoPlist`. **Rebuild** after pulling that change.

## Device QA

1. Rebuild dev client (`npx expo run:ios` or `run:android`) — native module added.
2. Map → allow location → blue puck appears.
3. Locate with sheet open → centers selected venue.
4. Locate with sheet closed → centers you; second tap → world zoom.
5. Deny permission → no puck; locate falls back to venue bounds refit if no coords.

## Next: P2O-C

Read `user_presence` for hub active friends, map friend semantics, checkpoint activity sort.
