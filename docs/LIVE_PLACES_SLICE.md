# Live Places — native parity slice

PWA reference: `apps/web/src/app/live-places/page.tsx`.

## Shipped

| Feature | Native |
|---------|--------|
| **Heat leaderboard** | `buildLivePlacesVenueRows` — sort by `inside + nearby` (live presence only) |
| **Vibe ladder** | `livePlacesVibe` from total headcount |
| **Friend previews** | Chips from accepted friends checked in at venue |
| **Distance** | Device GPS when granted, else my live presence coords |
| **Story highlight** | `fetchVenueIdsWithStories` → card border glow |
| **CTAs** | Open on map (`/map?venueId=`) · Scene (`/venue-activity?venueId=`) |
| **Empty state** | “City’s taking a breath” |
| **Presence poll** | 25s `reloadPresence` on screen (PWA page interval) |

## Files

- `apps/mobile/src/lib/livePlaces.ts`
- `apps/mobile/src/lib/fetchVenuesPreview.ts` — `fetchVenuesCatalog()` (500 venues)
- `apps/mobile/src/components/liveplaces/LivePlacesVenueCard.tsx`
- `apps/mobile/src/screens/LivePlacesScreen.tsx`
- Route: `apps/mobile/app/(app)/live-places.tsx`

## Deferred / follow-ups

- Dedicated Supabase channel `live-places-user-presence` (global `PresenceProvider` already realtime + 45s poll)
- Hub rail: still preview cards from `fetchVenuesPreview` (12), not full heat stack
- **Native presence writes:** **Era 2 / `P2O-D` only** — after [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) Mirror sign-off

## QA

1. Hub → Live Places → All
2. With friends live at venues, cards show INSIDE/NEARBY counts and avatar chips
3. “Open on map” deep-links map tab with venue selected
4. “Scene” opens venue activity for that `venueId`
