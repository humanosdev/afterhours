# Sacred files and rules

**Purpose:** Files and packages that must not be casually edited. Cursor agents and humans should read this before refactors, “cleanup,” or mobile prep that touches presence, map, or notifications.

**Related:** [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md), [MIGRATION_PHASES.md](./MIGRATION_PHASES.md)

---

## Rules (short)

1. **No drive-by refactors** of sacred files — one behavioral concern per PR, explicit plan.
2. **Do not bundle** map/AppShell/notification changes with mobile scaffold or shared deduplication.
3. **`packages/shared`** changes affect future mobile + web — require `npm run test:shared`.
4. **Do not enable mobile `user_presence` writes** without gates in [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md).
5. Phase 1 intentionally **did not** touch map or AppShell — keep that discipline until web write retirement.
6. **Post–2F:** `apps/mobile` may read **own `profiles` row** only; do **not** add location, `user_presence`, or other table reads without a new phase plan.
7. **Phase 2G:** navigation planning docs only — no map engine, GPS, or presence I/O.
8. **Post–2H:** native tabs are Hub / Map / Create / Chat / Profile **placeholders only** — still no Mapbox, `expo-location`, or `user_presence`; inherit web IA, do not redesign independently.
9. **Native `supabase.from(...)` / new `.from()` calls:** **Forbidden** unless tied to a **named migration sub-phase (2K–2O or post–2O)** in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md), with PR scope limited to that phase and **grep audit** (`rg "\.from\(" apps/mobile`) + `npm run test:shared` + `npx tsc --noEmit` documented. **2J** itself adds **no** new `.from()` — planning only.

---

## Sacred files

### `apps/web/src/app/map/page.tsx`

| | |
|---|---|
| **Owns** | Mapbox map UI, `watchPosition` GPS stream, map-side presence sync calls, local heat/distance helpers, polling `user_presence`, map-specific UX (auto-tour, bottom sheet, etc.) |
| **Does not own** | Shared zone math (uses `syncUserPresenceWithVenuesFromCoords` which calls `@intencity/shared` internally) |
| **Phase 1** | **Zero diff** `e066023..2efb525` |
| **Change when** | Map product work, or **Phase 2F** web write retirement (remove upsert path only with a dedicated plan) |
| **Avoid** | “Prepare for mobile” refactors, heat deduplication drive-bys, cadence changes without QA |

---

### `apps/web/src/components/AppShell.tsx`

| | |
|---|---|
| **Owns** | App chrome, auth shell routing, **non-map** geolocation (`getCurrentPosition` every **12s**), venue cache for shell, calls `syncUserPresenceWithVenuesFromCoords` or fallback lat/lng upsert |
| **Critical invariant** | **Skips presence sync on `/map`** — map owns `watchPosition`; prevents duplicate writes and notification dedupe races |
| **Phase 1** | **Zero diff** `e066023..2efb525` |
| **Change when** | Shell UX, or **2F** when removing shell GPS writes for native-primary users |
| **Avoid** | Changing 12s interval, `/map` skip, or venue load timing without presence QA |

---

### `apps/web/src/lib/userPresenceVenueSync.ts`

| | |
|---|---|
| **Owns** | **Canonical production presence orchestrator:** `syncUserPresenceWithVenuesFromCoords` — read prev row, `computePresenceFromGps`, upsert `user_presence`, friend notifications (`friend_online`, `friend_joined_venue`, `friend_nearby` at **300m**) |
| **Imports shared** | `computePresenceFromGps` only (Phase 1B-small) |
| **Local duplication** | `distanceMeters` for nearby notification math (not imported from shared — intentional for Phase 1 scope) |
| **Change when** | Presence behavior change (requires tests + manual QA), or extracting orchestrator to mobile in **2D+** (parallel module, not silent web change) |
| **Avoid** | Moving Supabase or `createNotification` into `packages/shared` |

---

### `apps/web/src/lib/userPresenceWrite.ts`

| | |
|---|---|
| **Owns** | `upsertUserPresenceGhostSafeCoords`, `upsertUserPresenceLatLng` (minimal ping), `SHELL_GEOLOCATION_OPTIONS` |
| **Ghost shape** | Clears venue fields; `venue_state: "outside"` — must stay aligned with [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) |
| **Change when** | Upsert shape migrations (with schema plan), ghost semantics product change |
| **Avoid** | Deleting helpers because `supabaseClient.ts` has unused `upsertMyPresence` — separate dead-code cleanup |

---

### `apps/web/src/lib/notifications.ts`

| | |
|---|---|
| **Owns** | `createNotification`, friend lists, notification preferences, in-app notification plumbing |
| **Presence coupling** | Called from `userPresenceVenueSync.ts` for friend presence events |
| **Phase 1** | **Untouched** |
| **Change when** | Notification product work, or **single-writer** redesign when mobile writes (2D+) |
| **Avoid** | Duplicate notification paths from mobile without removing web triggers for same events |

---

### `apps/web/src/lib/presence.ts`

| | |
|---|---|
| **Owns** | **Shim** re-exports from `@intencity/shared` (windows, freshness, coordinates); **local** social copy: `getFriendSocialActivitySubtitle`, `getFriendProfileVenueHeadline`, `getFriendProfileStatusLabel` |
| **Consumers** | Hub, friends, profiles — import `@/lib/presence`, not `@intencity/shared` directly (stable path) |
| **Change when** | Window constant changes (affects all UIs), or moving copy to i18n later |
| **Avoid** | `export *` from shared through this file — keep **curated** named exports (Phase 1 decision) |

---

### `apps/web/src/lib/venueHeatColors.ts`

| | |
|---|---|
| **Owns** | Thin shim: `export { venueHeatHexFromActivity } from "@intencity/shared"` |
| **Consumers** | Hub, search (via `@/lib/venueHeatColors`) |
| **Not used by** | `map/page.tsx` — map has its own `venueCombinedActivityToHeatHex` (intentional) |
| **Change when** | Heat product tuning — change shared + tests, not duplicate map logic in same PR unless planned |

---

### `packages/shared/**`

| | |
|---|---|
| **Owns** | All **deterministic** presence/venue/heat/geo logic (see [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md)) |
| **Must not import** | React, Next, Expo, Supabase, `window`, `navigator` |
| **Tests** | `npm run test:shared` — required on every shared change |
| **Change when** | Math/windows/zone behavior — with unit test updates and awareness mobile will import same code |
| **Avoid** | Side effects, DB types, notification strings; breaking API without version note in PR |

**Key modules:**

| Path | Role |
|------|------|
| `src/venue/computePresenceFromGps.ts` | Zone selection + state machine |
| `src/presence/constants.ts` | Time windows, thresholds |
| `src/presence/freshness.ts` | live / recent / stale / online badge |
| `src/presence/coordinates.ts` | Validation, fallback detection |
| `src/geo/distanceMeters.ts` | Haversine |
| `src/venue/haloLimitM.ts` | Halo radius fallback |
| `src/heat/venueHeatHexFromActivity.ts` | Activity → color |

---

## Files that are important but not “sacred”

Safe to change in focused PRs when needed — still test presence if touched:

| File | Note |
|------|------|
| `apps/web/src/lib/userPresenceRealtime.ts` | Realtime subscription helpers |
| `apps/web/next.config.js` | `transpilePackages: ["@intencity/shared"]` |
| `apps/web/package.json` | Workspace dep on `@intencity/shared` |
| `README.md` | Install / `test:shared` |

---

## What requires explicit planning

| Change type | Plan required |
|-------------|----------------|
| Edit sacred files above | Yes — QA checklist, link to migration phase |
| Change `MAP_ACTIVITY_WINDOW_MS` / `FRIEND_ONLINE_BADGE_MS` | Yes — cross-platform display impact |
| Add second presence writer (mobile) | Yes — [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) gates |
| Dedupe map heat or page-level `distanceMeters` | Yes — dedicated PR, not with 2B scaffold |
| Schema / RLS on `user_presence` | Yes — phase 2D–2F, rollback |
| Refactor `map/page.tsx` for size | Yes — behavior parity, map QA |

---

## Phase 1 proof (for git archaeology)

Sacred web files had **no changes** between Phase 0 and Phase 1 finalize:

```bash
git diff e066023..2efb525 -- \
  apps/web/src/app/map/page.tsx \
  apps/web/src/components/AppShell.tsx \
  apps/web/src/lib/notifications.ts \
  apps/web/src/lib/userPresenceWrite.ts
# expect empty
```

Phase 1 **did** change: `userPresenceVenueSync.ts`, `presence.ts`, `venueHeatColors.ts`, `packages/shared/**`, root/workspace config.

---

## Verification before merging presence-related work

```bash
npm run test:shared
npm run build
```

Manual (web): `/map` inner confirm ≥60s, navigate map → hub → map, ghost mode, spot-check notifications.

---

## `apps/mobile` (post–2J plan)

| | |
|---|---|
| **Owns today** | Expo auth shell, Phase 2C UI, Phase 2H–2I shell, Phase 2F read-only own profile, `@intencity/shared` smoke on Hub, Metro monorepo config |
| **Does not own** | `user_presence` (read/write), geolocation, live map data, hub/chat/stories **data** (until **2K–2O**), notifications delivery |
| **Change when** | UI polish, own-profile read (2F), or an **approved** **2K+** phase per [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) |
| **Avoid** | New `.from()` without named phase + audit (rule 9); `expo-location`, `user_presence` I/O, “quick map screen” without phase approval |
| **Navigation** | Phase 2H Hub / Map / Create / Chat / Profile (placeholders); no fixed Search tab — web `BottomNav.tsx` is UX source of truth |

---

## Cursor agent preamble

When asked to “add mobile” or “fix presence”:

1. Read [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) — confirm current sub-phase (**post–2J** = data ladder documented; next code is **2K** unless amended; **no** new `.from()` without named phase).
2. Read [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) — confirm writer rules.
3. Do not touch sacred **web** files unless the task explicitly names them and the phase allows it.
4. Do not add `expo-location` or `user_presence` writes to mobile without presence-ownership gates.
5. Do not redesign native navigation independently — inherit web/PWA structure; see [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical).
