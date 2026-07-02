# Native / mobile architecture

**Purpose:** Durable context for Intencity’s path from PWA (`apps/web`) to a downloadable native app (`apps/mobile`). Read this before scaffolding mobile, changing presence writes, or refactoring sacred web files.

**Related docs:**

- [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) — phase checklist and gates
- [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) — who may write `user_presence` and when
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) — files that must not be casually changed
- [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) — product launch scope (**different** “Phase 1/2” naming)

---

## Long-term goal

| Direction | Target |
|-----------|--------|
| **Native app** | Real downloadable iOS/Android app (`apps/mobile` — **auth shell only** today) |
| **Physical presence authority** | Eventually **mobile** owns GPS → `user_presence` writes |
| **Web** | Eventually **social viewer** — hub, map viewer, chat, stories, discovery — not the primary GPS writer |
| **Shared logic** | `packages/shared` holds **deterministic** rules used by both platforms |
| **No duplicated brain** | Zone math, freshness windows, heat ramps live in one package |
| **Transition safety** | Do **not** break current web/PWA behavior while migrating |

Presence on web today is **best-effort PWA** (12s shell pings, map `watchPosition`). Native should eventually make presence **more accurate and confidence-based** — that is a **later** phase, not Phase 2A.

---

## UX source of truth (critical)

> **Canonical doctrine:** [Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine) — **parity = exact user-facing equivalence**; **native upgrade = same product, better execution**; PWA is the **blueprint**, native the **better production implementation**.

| | |
|---|---|
| **`apps/web` (PWA)** | **Source of truth** for visual identity, product hierarchy, route/surface inventory (including modals/sheets/overlays), behavior/logic, copy/states, map/social/presence **semantics** |
| **`apps/mobile`** | Must **mirror user-facing result** exactly — implementation may differ only for equal-or-better UX **without** a separate design language |

**Do not** invent alternate IA, palette, or navigation. **`VP-1` and `P2O-A` are scaffolds/engine checkpoints — not visual or product parity.** **`VP-2A`** (brand) and **`VP-2B`** (screen architecture) are complete. Residual **`VP-2`** visual polish + honesty audit (**§12–§14** [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md)) precede **`P2O-B`**. **`P2O-B` paused** until **`VP-2`** sign-off ([implementation gate order](./MIGRATION_PHASES.md#implementation-gate-order)).

### Misleading UI rule

Native must not display **fake** data that implies a working feature (example: hardcoded chat bubbles, fake unseen rings, `—` engagement counts). Use **empty states**, **disabled** controls, or **explicit preview copy** instead. See [§14 Misleading UI policy](./PWA_NATIVE_PARITY_AUDIT.md#14-misleading-ui-policy-native).

### Dependency parity (web → native)

| Required for core shell | Web env | Native env |
|-------------------------|---------|------------|
| Supabase | `NEXT_PUBLIC_SUPABASE_*` | `EXPO_PUBLIC_SUPABASE_*` |
| Mapbox (dev build) | `NEXT_PUBLIC_MAPBOX_TOKEN` | `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` |

Full table: [§13 Native dependency audit](./PWA_NATIVE_PARITY_AUDIT.md#13-native-dependency-audit-web-vs-mobile). **Not on mobile:** service role, VAPID private, Resend, web-only API routes.

### VP-2 glass stack (`expo-blur` + `expo-linear-gradient`)

`GlassSurface` uses `expo-blur` + tint + sheen (`src/components/GlassSurface.tsx`). **Known VP-2 gap:** post-blur tint overlay (~72% opacity) can mask frost — see [§16 strict verification](./PWA_NATIVE_PARITY_AUDIT.md#16-vp-2-strict-verification-pass-pre-signoff). **`VP-2` is not signed off**; **`VP-2D`** targets glass + hub/map chrome. Future semantics: `src/theme/paritySemantics.ts`. **Dev client** required for blur + Mapbox QA.

### Production web/PWA navigation (target model)

Implemented in `apps/web/src/components/BottomNav.tsx` and related shell:

| Surface | Role |
|---------|------|
| **Hub** (`/hub`) | Home feed — stories, venue energy, social pulse |
| **Map** (`/map`) | **Primary core surface** — map-centered going-out experience |
| **Create** (center) | Stories / share capture — not a generic “fifth tab” label |
| **Chat** (`/chat`) | Messages and conversation |
| **Profile** (`/profile`) | Account, moments, settings entry |
| **Search** | Integrated into hub, map, and overlays — **not** necessarily its own permanent bottom tab |

Visual model on web: **floating / glass** bottom control (`ah-glass-control`), icon-only items, map as the anchor of the product.

### Native navigation today (Phase **2H** + **`VP-1`** parity stack)

| Native tab | Status |
|------------|--------|
| **Hub** | Phase **2K** friends + **2L** venues + **2M** read-only **Shares** (`stories`) + `@intencity/shared` smoke |
| **Map** | **`P2O-A`**: **`@rnmapbox/maps`** dark **`MapView`** + **`2L`** venue list (**2O** filter). Catalog coordinate pins only — **no GPS puck**, **no** `user_presence` **I/O**, **no** web-style heat overlays |
| **Moments** | Expo route **`create`**, **`VP-1` tab title** aligns with Stories center action — composer/camera/upload **web-only** |
| **Chat** | **2N** read-only previews — **`chats`**, **`messages`**, peer **`profiles`** — row tap opens **`/chat/[id]`** **scaffold only** (**no composer**) |
| **Profile** | Phase **2F**: read-only own `profiles` row + sign out · **Friends** opens **`/friends`** roster (**2K** reads) · **⋯** mirrors secondary web entry points (**shell**) |

Signed-in **`(app)`** uses an **`expo-router` `Stack`**: **`(tabs)`** remain the persistent bottom-nav experience; **`/friends`, `/privacy`, `/chat/[id]`, `/moments/[id]`, `/u/[username]`**, and other placeholders are siblings so deep links mimic PWA IA without implying feature-complete native behavior (`ParityPlaceholderScreen` banner).

**Search** stays **integrated** (**2O**) on Hub · Chat · Map — no mandatory Search tab. Standalone **`/search`** parity is scaffolded at **`/search-discovery`** (**no networked discovery**).

**Native map (**`P2O-A`**):** read-only **`@rnmapbox/maps`** **`MapView`** using catalog **`venues`** coordinates (**still no GPS puck**). GPS, heat/web parity overlays, **`user_presence`**, and realtime chat follow later Post–2O slices (see [checkpoint](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint)).

### Phase 2G — Web-parity navigation plan ✅

Documented target tabs, integrated search direction, and placeholder strategy. See [MIGRATION_PHASES.md](./MIGRATION_PHASES.md#phase-2g--web-parity-native-navigation-plan-).

### Phase 2H — Native nav parity shell ✅

Implemented Hub / Map / Moments / Chat / Profile routes aligned with production `BottomNav.tsx`. Supabase reads through **2N** + **2O** local search — approved tables per [ladder](./MIGRATION_PHASES.md). **`P2O-A`** delivers the Mapbox **`MapView`** shell (read-only **`venues`** pins). **`VP-2`** must align **visual identity** with deployed PWA before **`P2O-B`** resumes.

| Tab | Web route | Native 2H |
|-----|-----------|-------------|
| **Hub** | `/hub` | **2K** + **2L** + **2M** — Moments, Active friends, Live places, Shares (read-only) |
| **Map** | `/map` | **`P2O-A`** — Mapbox **`MapView`** (`StyleURL.Dark`) + **2L** venue list scaffold |
| **Moments** | center (`/stories` on web) | Placeholder — Expo route **`create`**; **`VP-1`** tab title **Moments** |
| **Chat** | `/chat` | **2N** — read-only list previews (**`chats`**, **`messages`**, **`profiles`**) · **`VP-1` `/chat/[id]` scaffold** (still **no composer**) |
| **Profile** | `/profile` | **2F** read-only `profiles` hydration · **`VP-1` roster + overflow shells** |

**Still out of scope (post–2H):**

| Do not implement without later phase | Notes |
|--------------------------------------|--------|
| Map engine (**`@rnmapbox/maps`**) **`P2O-A`** + live GPS / overlays | **`P2O-A`** **done** read-only (**no** puck); puck + GPS **`P2O-B`**+; overlays/heat realtime still web-parity backlog |
| Live GPS / `expo-location` | Web remains presence writer |
| `user_presence` reads or writes | See [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) |
| Integrated search UX | Overlays on hub/map — **2O** |
| Presence timing window changes | `packages/shared` constants unchanged |

Details: [MIGRATION_PHASES.md](./MIGRATION_PHASES.md#phase-2h--native-nav-parity-shell-).

### Long-term native UX convergence

When map and social features migrate, native should match web/PWA:

- **Map-centered** experience (same primary surface as production)
- **Floating / glass** bottom nav aligned with web tokens and interaction model
- **Integrated search** (overlays/surfaces — same as web, not a bolt-on permanent tab unless web does)
- **Same information hierarchy** and Intencity brand feel
- **Inherited behavior** from existing web flows — not parallel “native-only” product decisions

### Boundaries (unchanged by UX work)

- Web/PWA still owns **live** production presence and map logic until an explicit presence phase
- **No** `user_presence` writes on native yet
- **No** changes to `@intencity/shared` timing / activity constants without a cross-platform plan
- **No** accidental navigation divergence — if native nav changes, it must be an explicit phase tied to web parity, not drive-by tab edits

---

## What is complete today

### Phase 0 — monorepo (`e066023`)

- Repo is an npm workspace: `apps/*`, `packages/*`
- Production app: **`apps/web`** (Next.js 14, Supabase, Mapbox, PWA)
- Vercel / local dev: install from **repo root**; `.env.local` at root (symlink into `apps/web` if needed)
- Checkpoint: **`e066023`** = stabilized post-feature Phase 0

### Phase 1 — shared deterministic engine (`2efb525`)

- **`packages/shared`** (`@intencity/shared`): pure TypeScript, no React/Next/browser/Supabase
- Production web imports shared for:
  - `computePresenceFromGps` → `apps/web/src/lib/userPresenceVenueSync.ts`
  - Freshness / coordinate helpers → `apps/web/src/lib/presence.ts` (shim + local social copy)
  - `venueHeatHexFromActivity` → `apps/web/src/lib/venueHeatColors.ts`
- **Web still owns** all geolocation I/O, Supabase upserts, friend notifications, UI
- Checkpoint: **`2efb525`** = Phase 1 finalized cleanup

Phase 1 git range (for `git log` / `git diff`):

| Commit | Meaning |
|--------|---------|
| `e066023` | Phase 0 stabilized baseline |
| `ffc452c` | Shared package extraction foundation (web untouched) |
| `99eb49f` | Production wires `computePresenceFromGps` |
| `db59947` | Shared venue heat shim (`venueHeatColors.ts`) |
| `dcc89e8` | Shared freshness shim (`presence.ts`) |
| `2efb525` | Phase 1 cleanup (comments, dead code, README) |

---

## Current mobile status (post–2O — read-only ladder complete)

| | |
|---|---|
| **Expo** | SDK 54, expo-router, Expo Go verified |
| **Auth** | Supabase email/password, SecureStore |
| **UI** | Phase 2C shell + **2I** visual parity (glass nav, compact placeholders) |
| **Navigation** | Phase 2H routes + **2I** floating tab bar — see [UX source of truth](#ux-source-of-truth-critical) |
| **Data** | **2F**–**2N** approved `.from()` reads + **2O** **local-only** integrated search — **no** `user_presence`, **no** `expo-location`; **`P2O-A`** adds **`@rnmapbox/maps`** using the **same** approved **`venues`** read path (**no** new tables / `.from()` targets) |
| **Shared** | Smoke import on Hub tab — **presence windows unchanged** |
| **Authority** | **Non-authoritative** — web owns live map/presence **writes** and full web-only overlays |
| **Post–2O plan** | **`P2O-A`** **complete** (engine) · **`VP-2`** **next** (visual identity) · **`P2O-B`** **paused** — [checkpoint](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint) |

**Production UX today** is entirely on **`apps/web` (PWA):** interactive map, venues, stories/shares, chat, profile, friends, notifications, presence.

---

## Current architecture (through Phase 2O)

```
packages/shared/     ← deterministic engine (math, windows, zone state)
apps/web/            ← production runtime (GPS, DB, notifications, full product UI, PWA)
apps/mobile/         ← web-parity shell + 2F–2N reads + 2O local search + **P2O-A** Mapbox **`MapView`** (**read-only `venues`**) — **`P2O-B`** next for GPS
```

### `packages/shared` owns

- `computePresenceFromGps` — inner / outer / halo, closest venue wins, `inner_pending` → `inner_confirmed` after 60s
- Presence time windows (20m map activity, 60m recent, 4m friend “online” badge)
- Coordinate validation and map-fallback detection
- `distanceMeters`, `haloLimitM`
- `venueHeatHexFromActivity`

### `apps/web` owns

- **All** `user_presence` writes today
- Canonical orchestrator: `syncUserPresenceWithVenuesFromCoords` in `userPresenceVenueSync.ts`
- Geolocation: `AppShell` (12s, skips `/map`), `map/page.tsx` (`watchPosition`)
- Ghost mode DB shape via `userPresenceWrite.ts`
- Friend notifications: `friend_online`, `friend_joined_venue`, `friend_nearby` (300m)
- Map rendering, heat GeoJSON (map still has **local** heat helper — intentional duplication)
- Auth (Supabase SSR cookies), PWA, service worker, web push (VAPID)

### Future `apps/mobile` will own

- Native GPS (foreground, then background)
- Physical presence upserts (after gated migration — see [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))
- Native push (APNs / FCM)
- Native UI for core flows (read-first, then feature parity)

`apps/mobile` **must import** `@intencity/shared` for zone/state and display windows — **not** copy-paste from web shims.

---

## Phase 2 goal (not implemented in 2A)

Phase 2 prepares native/mobile **without** changing production presence behavior in 2A.

| Sub-phase | Status | Scope |
|-----------|--------|--------|
| **2A** | ✅ | Architecture docs |
| **2B** | ✅ | Mobile scaffold — auth, shared smoke |
| **2C** | ✅ | Native shell polish — **no** new product behavior |
| **2D** | ✅ | Docs + audit checkpoint |
| **2E** | ✅ | Read-only product shell — bottom tabs + placeholder surfaces |
| **2F** | ✅ | Read-only own `profiles` hydration on Profile tab |
| **2G** | ✅ | Web-parity native navigation **plan** |
| **2H** | ✅ | Nav parity **shell** — Hub / Map / Create / Chat / Profile (Hub gains **2K** / **2L** / **2M** data) |
| **2I** | ✅ | Visual parity **shell** — glass nav, denser product-like placeholders |
| **2J** | ✅ | Read-only data **plan + gates** — ladder **2K–2O**, no new `.from()` in 2J |
| **2K** | ✅ | Read-only accepted **friends** — `friend_requests` + `blocks` + `profiles` (Hub + Profile count) |
| **2L** | ✅ | Read-only **`venues`** — Hub live places + Map list + **`P2O-A`** Mapbox pins (**no** GPS / **`user_presence`**) |
| **2M** | ✅ | Read-only Hub **`stories`** (shares) + profile hydrate — **no** realtime / actions on native |
| **2N** | ✅ | Read-only Chat list — **`chats`** + **`messages`** + **`profiles`** — **no** realtime / send |
| **2O** | ✅ | Integrated **local** search (Hub / Chat / Map) — **no** new `.from()` |
| **Post–2O** | **`P2O-A`✅ · `P2O-B` next** | **`P2O-A`**: Mapbox + read-only **`venues`** — **`P2O-B`**: location — then **`user_presence`** slices per [checkpoint](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint) |

Details: [MIGRATION_PHASES.md](./MIGRATION_PHASES.md).

---

## Read-only data migration ladder (Phase 2 complete)

**Purpose:** Order native **read-only** Supabase work so it mirrors web/PWA priorities without inventing parallel product behavior. **Web/PWA remains source of truth** for UX and production behavior.

| Step | Phase | What ships (when implemented) | Still forbidden |
|------|-------|------------------------------|-----------------|
| 1 | **2K** | Friends / social graph reads (RLS-safe) ✅ | `user_presence`, GPS puck / **`expo-location`** |
| 2 | **2L** | Venues read-only + **`P2O-A`** map pins ✅ | **`expo-location`**, **`user_presence`**, web heat overlays |
| 3 | **2M** | Hub **`stories`** share preview (RLS-safe) ✅ | Writes, presence, realtime |
| 4 | **2N** | Chat list read-only ✅ | Send, realtime, thread screen |
| 5 | **2O** | Integrated search — **local filter** only ✅ | Fixed Search tab |
| — | **Post–2O** | **`P2O-A`** **complete** (**Mapbox** + **`venues`**; **no** GPS/`user_presence`). **`P2O-B`–`P2O-D`** ordering **unchanged** — [checkpoint](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint) | Separate PRs per slice + [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) for writes |

**Gates (every step):** Named phase in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md); no new `.from()` without that phase + audit ([SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md)); `npm run test:shared`; `npx tsc --noEmit`; do not touch `apps/web/src` or `packages/shared` unless the task explicitly allows.

**Through 2O (today):** **`profiles`**, **`friend_requests`**, **`blocks`**, **`venues`**, **`stories`**, **`chats`**, **`messages`** + **2O** purely client-side search helpers — see [MIGRATION_PHASES.md](./MIGRATION_PHASES.md).

### Post–2O (planning checkpoint)

Full ordering of map vs location vs **`user_presence`** read/write: [MIGRATION_PHASES.md — Post-2O roadmap checkpoint](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint). **`apps/web`** remains authoritative until each native slice lands.

---

## Recommended native stack

**Recommendation: Expo + development build + EAS** (not “Expo Go only,” not bare React Native from day one).

| Piece | Role |
|-------|------|
| **Expo SDK** | App lifecycle, config plugins, standard RN toolchain |
| **expo-router** | File-based navigation (familiar coming from Next.js) |
| **Development build** | Required for Mapbox (`@rnmapbox/maps`) and serious location APIs |
| **EAS Build** | TestFlight / Play internal testing, signing |
| **@intencity/shared** | Same workspace package as web (`"@intencity/shared": "*"`, Metro monorepo config in 2B) |

Bare React Native is a fallback if Expo cannot support a hard native requirement later. For Intencity’s stated goals (background location, Mapbox, store shipping), Expo + dev client is the default.

### Not in scope for Phase 2A

- Creating `apps/mobile/`
- Installing Expo
- Enabling mobile `user_presence` writes
- Changing `apps/web` runtime, schema, or RLS

---

## Proposed `apps/mobile` layout (future — 2B+)

Use this when scaffolding; paths may adjust slightly at implementation time.

```
apps/mobile/
├── app/                    # expo-router
├── src/
│   ├── lib/
│   │   ├── supabase/       # client + SecureStore session
│   │   ├── presence/       # sync orchestrator (mirrors web, uses shared math)
│   │   ├── location/       # permissions, foreground/background tasks
│   │   └── notifications/  # device token registration
│   ├── features/
│   └── components/
├── app.config.ts
├── eas.json
├── metro.config.js         # monorepo: @intencity/shared
└── package.json
```

Do **not** move Supabase writes or browser APIs into `packages/shared`. Orchestration stays in `apps/web` until a deliberate extraction with platform ports (2E+ at earliest).

---

## What mobile should reuse from `packages/shared`

| Module | Use on mobile |
|--------|----------------|
| `venue/computePresenceFromGps` | Every GPS-driven presence tick |
| `presence/freshness` | UI labels: live / recent / stale / online badge |
| `presence/coordinates` | Reject invalid GPS; detect fallback coords |
| `presence/constants` | Windows, `INNER_CONFIRM_MS`, `NEARBY_THRESHOLD_M` (when notifications ported) |
| `geo/distanceMeters` | Nearby friend math, distances |
| `heat/venueHeatHexFromActivity` | List/map heat colors |

Import from `@intencity/shared` directly. Do not depend on web shims (`@/lib/presence.ts`).

---

## Intentional duplication (do not “fix” during mobile scaffold)

- `apps/web/src/app/map/page.tsx` — local heat + `distanceMeters` (untouched in Phase 1 by design)
- Page-level `distanceMeters` in hub, search, live-places, `districtFlowTrails.ts`
- `userPresenceVenueSync.ts` — local `distanceMeters` for 300m notification math only

Deduping these is optional cleanup **after** mobile scaffold, in dedicated PRs — not bundled with 2B.

---

## Verification commands

From **repository root**:

```bash
npm install
npm run test:shared    # 24 unit tests for packages/shared
npm run build            # apps/web production build
```

After changing `packages/shared`, always run `test:shared` before merging. After monorepo/workspace changes, confirm install resolves `@intencity/shared` from `packages/shared`.

**Cannot verify from docs alone:** production Vercel deploy, manual map↔hub presence handoff, notification delivery — require manual QA.

---

## Environment (future mobile)

Plan for **public** mobile env vars only (never service role in the app binary):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Mapbox public token (mobile SKU / billing TBD before map screen)

Web continues using existing Next.js `NEXT_PUBLIC_*` and root `.env.local`.

---

## Cursor / agent rules of thumb

1. Read [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) before editing presence-related web files.
2. Read [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) before any `user_presence` write on a new platform.
3. Do not conflate **migration Phase 2** with **V1 launch plan** moderation phases in `V1_LAUNCH_PLAN.md`.
4. Through **Phase 2O**: `.from()` limited to **`profiles`**, **`friend_requests`**, **`blocks`**, **`venues`**, **`stories`**, **`chats`**, **`messages`** as in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md); **no** `user_presence` on native; **Post–2O** map/presence slices (**P2O-A**…) are **explicit** and documented before implementation.
5. Web/PWA = production product **and UX source of truth**; native inherits parity — **do not** cement parallel IA.
6. **Post–2O:** first approved implementation slice defaults to **`P2O-A`** (Mapbox + read-only venues, **no** GPS/`user_presence`) unless the migration doc is amended.
7. Native nav/IA changes require explicit web-parity intent — see [UX source of truth](#ux-source-of-truth-critical).
