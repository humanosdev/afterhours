# Presence ownership

**Purpose:** Prevent dual-write bugs and clarify who owns physical presence today vs tomorrow. Any change that writes `user_presence` or triggers presence notifications must be checked against this document.

**Related:** [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md), [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md), [MIGRATION_PHASES.md](./MIGRATION_PHASES.md)

---

## One-sentence rule

**Exactly one client should perform physical `user_presence` upserts for a given user session at a time** — unless an explicit gate (beta flag, `presence_source` metadata, rollback plan) says otherwise.

---

## Current state (post–2F)

| Layer | Owner |
|-------|--------|
| **Deterministic rules** | `packages/shared` — zone math, windows, heat ramp, distance (**unchanged in 2F**) |
| **Side effects** | `apps/web` only — GPS, Supabase presence upserts, notifications |
| **Production write path** | `syncUserPresenceWithVenuesFromCoords` in `apps/web/src/lib/userPresenceVenueSync.ts` |
| **Ghost writes** | `upsertUserPresenceGhostSafeCoords` in `apps/web/src/lib/userPresenceWrite.ts` |
| **Geolocation** | `AppShell` (12s, **skips `/map`**), `map/page.tsx` (`watchPosition` + sync) |
| **Mobile** | Auth + **read-only own `profiles` row** — no `user_presence`, no `expo-location` |
| **Mobile shared usage** | Display smoke on Home tab (`MAP_ACTIVITY_WINDOW_MS`) — not production presence |
| **Mobile navigation** | Phase 2E tabs; Profile tab hydrated in Phase 2F |

`apps/web` imports `computePresenceFromGps` from `@intencity/shared` for **live** presence. Mobile does **not** call `computePresenceFromGps` with GPS or venue data and does **not** read `user_presence`.

**Product split:** Web/PWA = map, venues, stories, chat, full profile/presence — **and** source of truth for navigation/UX. Mobile = read-only scaffold + own profile display; temporary native tabs are not final IA ([NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical)).

---

## Future state (target)

| Layer | Owner |
|-------|--------|
| **Deterministic rules** | Still `packages/shared` |
| **Physical presence upserts** | **`apps/mobile`** (foreground → background) |
| **Web** | **Read** `user_presence` for map/hub/friends; **no** shell/map GPS upserts for users on native writer path |
| **Notifications** | **Single writer** — not both web and mobile firing `friend_*` for the same transition |

Native presence should evolve toward **confidence-based** physical presence (accuracy, dwell, motion). That is **not** implemented in shared or web today.

---

## What `packages/shared` owns vs does not own

### Owns (deterministic, no I/O)

- `computePresenceFromGps` — venue zones, `inner_pending` / `inner_confirmed`, 60s confirm (`INNER_CONFIRM_MS`)
- Freshness: `getPresenceFreshness`, `isPresenceLive`, `isFriendOnlineNow`, `isPresenceRecent`
- Constants: 20m map activity, 60m recent, 4m online badge, 300m nearby threshold constant, map fallback coords
- `distanceMeters`, `haloLimitM`, `venueHeatHexFromActivity`

### Does not own (never add to shared without a platform abstraction design)

- `navigator.geolocation` / CoreLocation
- Supabase client or `user_presence` upsert
- `createNotification` / push
- React, Next.js, Expo
- Ghost mode **orchestration** (the **upsert shape** is documented in web; mobile will mirror the same shape when implemented)

---

## Time windows: PWA heuristics vs native truth

Current production windows (in `@intencity/shared`, displayed via `apps/web/src/lib/presence.ts`):

| Window | Duration | Used for |
|--------|----------|----------|
| Map activity / “live” | **20 minutes** | Venue heat, map participation, `isPresenceLive` |
| Recent | **60 minutes** | “Recent” tier |
| Friend online badge | **4 minutes** | “Online now” pulse / profile label (`isFriendOnlineNow`) |

These values are **best-effort PWA heuristics** tuned for slow/unreliable web geolocation. They are **not** the final native truth model.

**Future native (2E+):** writes may use stricter confidence (accuracy radius, speed, dwell time) while UI may still map to shared freshness tiers for cross-platform friend lists — **design TBD**, schema may be required.

Changing shared window constants affects **both** platforms once mobile imports them — treat as a **product + migration** decision, not a drive-by tweak.

---

## Ghost mode

**Semantics must remain unchanged** when mobile is added:

- When `ghost_mode` is on: upsert lat/lng only; clear `venue_id`, `zone_type`; set `venue_state` to `outside`; clear `entered_inner_at`
- Implementation today: early return in `syncUserPresenceWithVenuesFromCoords` → `upsertUserPresenceGhostSafeCoords`
- Map UI also respects ghost — do not reintroduce venue context on friends’ views

Mobile must call the **same** DB shape, not a parallel interpretation.

---

## Web geolocation split (do not break)

| Route | Who pings GPS | Who calls sync |
|-------|---------------|----------------|
| **`/map`** | `map/page.tsx` (`watchPosition`) | `syncUserPresenceWithVenuesFromCoords` from map |
| **All other shell routes** | `AppShell` (`getCurrentPosition` every **12s**) | Same sync when venues loaded; else minimal lat/lng upsert |

`AppShell` **explicitly returns early on `/map`** to avoid duplicate DB writes and notification dedupe races. Any mobile or web change must preserve this invariant until web physical writes are retired in 2F.

---

## Dual-write prohibition

### NEVER (without a gate)

- Let **web and mobile** both upsert `user_presence` for the same logged-in user at the same time
- Call `createNotification` for presence events from **both** platforms for the same state transition
- Enable mobile writes in production before:
  1. **`presence_source` / `written_by_client` (or equivalent) metadata** exists in DB, and
  2. A **beta flag** or cohort rule defines who uses mobile writer, and
  3. A **rollback plan** (disable flag → web-only again)

### Why

`user_presence` is one row per user (`onConflict: user_id`). Last-writer-wins causes:

- Flapping `venue_id` / `venue_state`
- Broken `inner_pending` → `inner_confirmed` timing
- Duplicate or missed `friend_online` / `friend_joined_venue` / `friend_nearby` notifications

AppShell’s `/map` skip exists for **web-vs-web** duplication; web-vs-mobile is the same class of bug at larger scale.

---

## Safe migration sequence (reference)

| Step | Mobile writes? | Web writes? | Status |
|------|----------------|-------------|--------|
| 2A–2F | No | Yes | ✅ Complete (through read-only own profile) |
| 2G+ read-only data | No | Yes | Future — friends/venues/presence display |
| 2G+ presence beta | Beta only | Yes for non-beta | Future — beta flag + source metadata |
| Later | Primary (cohort) | Reduced / gated | Background + confidence |
| Final | Yes (target users) | **No** physical GPS upserts | Web viewer mode |

**No mobile `user_presence` reads or writes through Phase 2F.** Phase 2F adds read-only `profiles` for the signed-in user only; no `expo-location`.

---

## Notifications

Presence-driven notifications today (web only), created inside `userPresenceVenueSync.ts` using `notifications.ts`:

- `friend_online`
- `friend_joined_venue`
- `friend_nearby` (**300m** — literal in sync today; constant `NEARBY_THRESHOLD_M` exists in shared for future use)

**Rule:** When mobile becomes a writer, notifications must be emitted from **one** place only (mobile orchestrator, DB trigger, or edge function) — **not** duplicated from web and mobile.

Do not refactor `notifications.ts` casually; see [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md).

---

## `user_presence` upsert shape (unchanged across migration)

Production upsert fields (full sync path):

- `user_id`, `lat`, `lng`, `venue_id`, `zone_type`, `venue_state`, `entered_inner_at`, `updated_at`

`updated_at` is set at write time in web orchestration, not inside `packages/shared`.

---

## Rollback

If mobile beta writes cause issues:

1. Disable beta flag → web remains sole writer (current production behavior).
2. Do not revert `packages/shared` without coordinating web + any shipped mobile build.
3. Git checkpoints for Phase 1 engine: `2efb525` (see [MIGRATION_PHASES.md](./MIGRATION_PHASES.md)).

---

## Checklist before enabling mobile writes (2D+)

- [ ] Schema: `presence_source` / client id / `last_write_at` (or equivalent) designed and migrated
- [ ] Beta flag documented (`profiles` column or feature flag service)
- [ ] Single notification path agreed
- [ ] Ghost mode parity tested on mobile
- [ ] No concurrent web shell + mobile writes for beta users
- [ ] `npm run test:shared` and manual smoke on web unchanged for non-beta users
