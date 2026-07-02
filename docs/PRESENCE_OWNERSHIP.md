# Presence ownership

**Purpose:** Prevent dual-write bugs and clarify who owns physical presence today vs tomorrow. Any change that writes `user_presence` or triggers presence notifications must be checked against this document.

**Related:** [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md), [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md), [MIGRATION_PHASES.md](./MIGRATION_PHASES.md)


> **Doctrine:** eventual native **must match full production PWA surface area** with **exact user-facing equivalence** ([Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine)) — phased presence work is **one capability track**, never a parallel product.

---

## One-sentence rule

**Exactly one client should perform physical `user_presence` upserts for a given user session at a time** — unless an explicit gate (beta flag, `presence_source` metadata, rollback plan) says otherwise.

---

## Current state (post–2O read-only ladder complete)

| Layer | Owner |
|-------|--------|
| **Deterministic rules** | `packages/shared` — zone math, windows, heat ramp, distance (**unchanged**) |
| **Side effects** | `apps/web` only — GPS, Supabase presence upserts, notifications |
| **Production write path** | `syncUserPresenceWithVenuesFromCoords` in `apps/web/src/lib/userPresenceVenueSync.ts` |
| **Ghost writes** | `upsertUserPresenceGhostSafeCoords` in `apps/web/src/lib/userPresenceWrite.ts` |
| **Geolocation** | `AppShell` (12s, **skips `/map`**), `map/page.tsx` (`watchPosition` + sync) |
| **Mobile** | Auth + **read-only** `profiles`, **`friend_requests`**, **`blocks`**, **`venues`**, **`stories`** (Hub share preview), **`chats`**, **`messages`** (Chat **list previews**); **2O** — **local-only** integrated search (**no** new Supabase) — **no** `user_presence` read/write, no `expo-location` |
| **Mobile shared usage** | Display smoke on Hub tab (`MAP_ACTIVITY_WINDOW_MS`) — not production presence |
| **Mobile navigation** | Tabs under **`(tabs)`**: Hub / Map / **Moments** (`create`) / Chat / Profile; **`VP-1`** adds **`Stack` pushes** (read-only placeholders + `/friends` roster). No fixed Search tab. |

`apps/web` imports `computePresenceFromGps` from `@intencity/shared` for **live** presence. Mobile does **not** call `computePresenceFromGps` with GPS or live presence rows and does **not** read `user_presence`. Native **`venues`**, **`stories`**, **`chats`**, and **`messages`** reads are **social / UI preview** data only — **not** used as a physical location signal.

**Phase 2N:** Read-only **`chats`** + **`messages`** + counterpart **`profiles`** for the Messages tab mirrors web `/chat` **initial load** semantics — **no** realtime **`messages`** subscriptions, **no** `notifications` mutations, **no** send path on native ([MIGRATION_PHASES.md](./MIGRATION_PHASES.md#phase-2n--read-only-chat-list-previews-)).

**Era model:** [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) — native may **read** `user_presence` in **Era 1 (Mirror)**; native **writes** only in **Era 2 (Cutover)** after full parity sign-off.

### Post–2O plan pointer (checkpoint)

**Mirror era (now):** **P2O-A/B/C** ✅ · **MAP-B/C** ✅ — web remains **sole writer**; native displays presence for map/hub/live-places.

**Cutover era (later):** **`P2O-D`** — native becomes writer; web retires presence upserts for migrated cohort. **Deferred to final phase** — notifications ship first; web may stay full production for QA. See [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md).

Details: [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) · [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md).

**Product split today:** Web/PWA = production for **writes**, full chat/stories realtime, and navigation authority. Mobile = **mirror** toward full equivalence — map/presence **display** landed; **mutations** and **native writes** remain gated.

---

## Future state — Era 2 Cutover (target)

**Gate:** [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) — native **same or better** than PWA; explicit product sign-off.

| Layer | Owner |
|-------|--------|
| **Deterministic rules** | Still `packages/shared` |
| **Physical presence upserts** | **`apps/mobile`** (foreground → background) |
| **Web** | **Overview / marketing only** — **no login**, product routes **inaccessible**; **no** shell/map GPS upserts |
| **Notifications** | **Single writer** — not both web and mobile firing `friend_*` for the same transition |

## Future state — Era 3 Evolve (after cutover stable)

Break PWA platform limiters **one capability at a time** (continuous online, background location, confidence layers) — document semantic changes in [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md) when user-visible meaning shifts.

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
| 2A–2O | No | Yes | ✅ Through **2O** — **no** native `user_presence`; web sole physical presence writer |
| Post–2O **P2O-A** (Mapbox read-only `venues` pins) | No | Yes | **Complete** — catalog coords only; native still **not** a presence writer |
| **VP-2** (visual identity — no presence I/O) | No | Yes | **Next** — **blocks `P2O-B`** |
| Post–2O **P2O-B** (**`expo-location`**, still no `user_presence` writes by default) | No | Yes | **Paused** until **VP-2** — see [MIGRATION_PHASES.md](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint) |
| Post–2O **P2O-C** (native `user_presence` read) | No | Yes | **Future** — requires named phase + RLS |
| Post–2O presence beta | Beta only | Yes for non-beta | Future — beta flag + source metadata |
| Later | Primary (cohort) | Reduced / gated | Background + confidence |
| Final | Yes (target users) | **No** physical GPS upserts | Web viewer mode |

**Era 1:** Native **reads** `user_presence` for display; **must not write** until Era 2 sign-off ([PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md)). **P2O-D** requires single-writer controls + rollback — **never** convenience dual-write with web.

---

## Notifications

Presence-driven notifications today (web only), created inside `userPresenceVenueSync.ts` using `notifications.ts`:

- `friend_online`
- `friend_joined_venue`
- `friend_nearby` (**300m** — literal in sync today; constant `NEARBY_THRESHOLD_M` exists in shared for future use)

**Era placement:** Badges, toasts, push, and action-triggered **`createNotification`** ship in **Era 2 (NOTIF-3/2/4)** while web still writes presence. **Presence-driven** notification creation moves with **`P2O-D` (final)** — [NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md).

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
