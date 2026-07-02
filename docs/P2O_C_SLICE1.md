# P2O-C slice 1 — `user_presence` read-only

**Date:** 2026-05-18  
**Gate:** P2O-B slice 1 locate/GPS · **no** `user_presence` writes (P2O-D)

## Shipped

| Piece | Path |
|-------|------|
| Presence fetch + realtime | `src/lib/fetchUserPresence.ts`, `src/lib/userPresenceRealtime.ts` |
| PWA copy ladder | `src/lib/presence.ts` |
| Venue activity math | `src/lib/venuePresenceStats.ts` |
| App-wide provider | `src/providers/PresenceProvider.tsx` |
| Hub active friends | `app/(app)/(tabs)/hub.tsx`, `src/components/hub/HubActiveFriendChip.tsx` |
| Map friends subtitles | `MapSecondaryControls.tsx` |
| Venue sheet inside/nearby | `MapVenueSheet.tsx` |
| Checkpoint activity sort | `map.tsx` + `buildMapCheckpoints` |
| Locate check-in center | `mapLocateTarget.ts` |
| Resume GPS refresh | `useForegroundLocation.ts` (P2O-B slice 2) |

## PWA parity (this slice)

| PWA | Native |
|-----|--------|
| Hub `user_presence` + realtime | `PresenceProvider` (45s poll + postgres_changes) |
| Online friends strip | Same filters (`isFriendOnlineNow`, ghost, coords) |
| Map friend subtitles | `getFriendSocialActivitySubtitle` |
| Sheet inside/nearby counts | `getVenueSheetPresenceStats` |
| Checkpoint sort by activity | `buildMapCheckpoints` |
| Locate → check-in venue | `resolveMapLocateTarget` + presence |
| Friend markers on map | **Deferred MAP-B** |
| Heat / glow layers | **Deferred MAP-C** |
| Presence writes | **Deferred P2O-D** |

## Device QA

1. Reload dev client — Hub: friends live on PWA should appear under **Active friends** when online (~4 min window).
2. Map → **Friends** pill → subtitles (`At …`, `Away`, etc.) not placeholder copy.
3. Open venue sheet → **INSIDE** / **NEARBY** show numbers when PWA has crowd at that venue.
4. Checkpoint bar ◀ ▶ → higher-activity venues first.
5. Locate while checked in on PWA → should center venue (if `venue_id` on your presence row).

## Next

- **MAP-B** — friend avatar markers on map  
- **MAP-C** — heat, glow, auto-tour  
- **P2O-D** — native `user_presence` writes (gated)
