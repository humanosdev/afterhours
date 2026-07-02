# Presence windows — P2O-D cutover bundle (locked for later)

**Status:** Applied **2026-06-05** with Phase 2 native write cutover (`PRESENCE_WRITE_AUTHORITY = native`).  
**Authority:** Bundled with native write cutover only — not EVOLVE-2, not while web is sole writer.  
**Related:** [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md) · [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)

---

## Why these values

Current windows (`4m` / `20m` / `60m`) were tuned for **12s PWA pings** and forgiving browser GPS.  
Native at **2–5s writes** can be tighter and more honest without flicker.

**New split:** venue **heat** uses a **shorter** window than social “live” copy — dead venues should not glow for 20 minutes after the last ping.

---

## Locked constants (apply in `packages/shared/src/presence/constants.ts`)

| Constant | Today | **P2O-D value** | Used for |
|----------|-------|-----------------|----------|
| `FRIEND_ONLINE_BADGE_MS` | 4 min | **2 min** (`120_000`) | Pulse ring, hub active strip, “Online” / “At {venue}” headline |
| `MAP_ACTIVITY_WINDOW_MS` | 20 min | **12 min** (`720_000`) | Map markers, “Away · At …”, `isPresenceLive` for **copy** |
| `HEAT_ACTIVITY_WINDOW_MS` | *(new)* | **8 min** (`480_000`) | `getCountsForVenue`, heatmap, glow, checkpoint activity sort |
| `RECENT_WINDOW_MS` | 60 min | **30 min** (`1_800_000`) | “Recently at …”, sheet recent chips |
| `INNER_CONFIRM_MS` | 60 s | **90 s** (`90_000`) | FSM `inner_confirmed`, district-flow anchors, joined-venue notifs |
| `PROFILE_VENUE_DWELL_MS` | 15 min | **15 min — unchanged** | Permanent profile venue earn |
| `NEARBY_THRESHOLD_M` | 300 m | **300 m — unchanged** | `friend_nearby` notification threshold |

---

## New helper (apply with constants)

Add to `packages/shared/src/presence/freshness.ts`:

```typescript
/** Venue heat / glow / checkpoint sort — stricter than social “live” copy. */
export function isPresenceLiveForHeat(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  // age <= HEAT_ACTIVITY_WINDOW_MS
}
```

| Function | Window | Use |
|----------|--------|-----|
| `isFriendOnlineNow` | 2 min | Online badge |
| `isPresenceLive` | 12 min | Markers, social copy, map marker pool |
| `isPresenceLiveForHeat` | 8 min | Heat, glow, checkpoints, live places rank |
| `isPresenceRecent` | 30 min (between 12m and 30m tier) | Recent copy |

Update `getPresenceFreshness` tiers if product wants “recent” to start after 12m live (not 20m).

---

## Implementation checklist (P2O-D PR only)

- [x] Update `packages/shared` constants + `freshness.ts` + tests
- [x] Switch `getCountsForVenue` (mobile + web map) to `isPresenceLiveForHeat`
- [x] Keep `isPresenceLive` for markers, hub copy, sheet friend online chips
- [x] Port native `syncUserPresenceWithVenuesFromCoords` at 2–5s
- [x] Ghost-safe upsert on toggle
- [x] Retire web shell/map writes for native cohort
- [x] Read poll rewiring — `apps/mobile/src/lib/backgroundReadPolicy.ts` (Phase 3)

---

## Read-side polls (Phase 3 — native only)

Shipped in `backgroundReadPolicy.ts`. Rule: poll interval ≤ **tightest displayed window ÷ 6** (2m badge → 20s hub poll); UI clocks at **10s** so copy crosses window boundaries without waiting for the next fetch.

| Constant | ms | Surface |
|----------|-----|---------|
| `MAP_PRESENCE_POLL_MS` | 3_000 | Map tab presence fetch |
| `MAP_PRESENCE_CLOCK_MS` | 10_000 | Map glow / checkpoint UI tick |
| `HUB_PRESENCE_POLL_MS` | 20_000 | Hub / shell presence fetch |
| `HUB_PRESENCE_CLOCK_MS` | 10_000 | Hub subtitles / online chips |
| `BACKGROUND_PRESENCE_POLL_MS` | 60_000 | App backgrounded |
| `LIVE_PLACES_PRESENCE_POLL_MS` | 20_000 | Live places leaderboard |
| `CHAT_POLL_FALLBACK_MS` | 15_000 | Chat thread + inbox |
| `FOREGROUND_UNREAD_POLL_MS` | 15_000 | Notification badges |
| `RESUME_BURST_DEBOUNCE_MS` | 0 | Immediate refresh on resume |

---

## Explicitly not in this bundle

- Schema `last_seen_at` / heartbeat split (future)
- Outer-ring dwell gate for heat (future confidence layer)
- Native-only window overrides (forbidden — shared constants only)
