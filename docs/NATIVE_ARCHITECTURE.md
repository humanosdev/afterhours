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

| | |
|---|---|
| **`apps/web` (PWA)** | **Source of truth** for final UX, navigation structure, information hierarchy, brand feel, and product behavior |
| **`apps/mobile`** | **Phased read-only scaffold** — temporary shells until features migrate; **not** an independent product redesign |

**Do not** treat the current native tab layout as long-term navigation. **Do not** invent alternate information architecture on native. Native should **gradually inherit** the production web/PWA structure as each capability ships in a planned migration phase.

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

### Native navigation today (Phase 2H — web-parity shell)

| Native tab | Status |
|------------|--------|
| **Hub** | Placeholder feed shell + `@intencity/shared` smoke |
| **Map** | Placeholder only — no Mapbox, no GPS, no `user_presence` |
| **Create** | Placeholder — center-action tab styling; no camera/upload |
| **Chat** | Placeholder — no messages API |
| **Profile** | Phase 2F: read-only own `profiles` row + sign out |

**Search** is **not** a permanent bottom tab (matches web). Integrated search is a **later** phase.

Phase 2E scaffold was **replaced** in 2H; **2I** added floating/glass nav styling and denser product placeholders. Real map/chat data are future phases.

### Phase 2G — Web-parity navigation plan ✅

Documented target tabs, integrated search direction, and placeholder strategy. See [MIGRATION_PHASES.md](./MIGRATION_PHASES.md#phase-2g--web-parity-native-navigation-plan-).

### Phase 2H — Native nav parity shell ✅

Implemented Hub / Map / Create / Chat / Profile routes aligned with production `BottomNav.tsx`. **Placeholder screens only** — same Supabase boundary as 2F (`profiles` on Profile only).

| Tab | Web route | Native 2H |
|-----|-----------|-------------|
| **Hub** | `/hub` | Placeholder + shared smoke |
| **Map** | `/map` | Placeholder — no map SDK |
| **Create** | center action | Placeholder — center-action tab icon |
| **Chat** | `/chat` | Placeholder — no messages API |
| **Profile** | `/profile` | 2F read-only `profiles` hydration |

**Still out of scope (post–2H):**

| Do not implement without later phase | Notes |
|--------------------------------------|--------|
| Map engine (Mapbox, `@rnmapbox/maps`) | Map tab is shell only |
| Live GPS / `expo-location` | Web remains presence writer |
| `user_presence` reads or writes | See [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) |
| Integrated search UX | Overlays on hub/map — 2J+ |
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

## Current mobile status (post–2I)

| | |
|---|---|
| **Expo** | SDK 54, expo-router, Expo Go verified |
| **Auth** | Supabase email/password, SecureStore |
| **UI** | Phase 2C shell + **2I** visual parity (glass nav, compact placeholders) |
| **Navigation** | Phase 2H routes + **2I** floating tab bar — see [UX source of truth](#ux-source-of-truth-critical) |
| **Data** | Phase 2F — read-only own `profiles` row on Profile tab |
| **Shared** | Smoke import on Home tab only — **presence windows unchanged** |
| **Authority** | **Non-authoritative** — web owns `user_presence` |

**Production UX today** is entirely on **`apps/web` (PWA):** map, venues, stories/shares, chat, profile, friends, notifications, presence.

---

## Current architecture (as of Phase 2I)

```
packages/shared/     ← deterministic engine (math, windows, zone state)
apps/web/            ← production runtime (GPS, DB, notifications, full product UI, PWA)
apps/mobile/         ← web-parity nav shell + read-only own profile (profiles table only)
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
| **2H** | ✅ | Nav parity **shell** — Hub / Map / Create / Chat / Profile placeholders |
| **2I** | ✅ | Visual parity **shell** — glass nav, denser product-like placeholders |
| **2J+** | Future | Read-only data, map engine, gated presence — **explicit plan required** |

Details: [MIGRATION_PHASES.md](./MIGRATION_PHASES.md).

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
4. Post–2F: **no** `expo-location`, map engine, or `user_presence` on mobile; Supabase reads limited to own `profiles` until a new phase plan.
5. Web/PWA = production product **and UX source of truth**; mobile = read-only scaffold — **do not** cement the current four-tab layout as long-term.
6. **Post–2I:** web-parity nav + visual shell — still no GPS/presence/map SDK until later phases.
7. Native nav/IA changes require explicit web-parity intent — see [UX source of truth](#ux-source-of-truth-critical).
