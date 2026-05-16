# Migration phases (monorepo → native)

**Purpose:** Single source of truth for **engineering migration** phases (monorepo, shared engine, native app). This is **not** the same as product phases in [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) (moderation, admin, launch checklist).

**Current phase:** **Phase 2K complete** — read-only accepted friends (`friend_requests`, `blocks`, `profiles`) on Hub + Profile friend count. **No** `user_presence`, **no** writes. Next when approved: **2L** (venues).

---

## Current mobile status (as of Phase 2K)

| Area | Status |
|------|--------|
| **Expo scaffold** | ✅ `apps/mobile` — Expo SDK 54, expo-router, dev client config, EAS skeleton |
| **Supabase auth** | ✅ Email/password, SecureStore session, sign in / sign out |
| **Native shell UI** | ✅ Phase 2C — dark Intencity theme, safe areas, loading / login |
| **Product navigation** | ✅ Phase 2H routes + **2I** visual polish (floating/glass tab bar, denser placeholders) |
| **Profile hydration** | ✅ Phase 2F — read-only `profiles` row for signed-in user on Profile tab |
| **`@intencity/shared`** | ✅ Harmless smoke on Hub tab (`MAP_ACTIVITY_WINDOW_MS`) — **windows unchanged** |
| **Production presence authority** | ❌ **Mobile is not authoritative** — web/PWA only |
| **`expo-location` / GPS** | ❌ Not installed |
| **`user_presence` reads/writes** | ❌ None |
| **Supabase table reads** | ✅ **`profiles`** (own row) + **`friend_requests`** + **`blocks`** (read-only accepted friends, Phase **2K**) |
| **Map / hub / chat / stories** | Hub shows **real friend avatars** (2K); map/chat/stories data still **web/PWA** |

**Production product today:** `apps/web` (PWA) — map, venues, stories/shares, chat, profile, friends, notifications, and **all** physical presence writes.

### UX / navigation (do not confuse with production)

**Web/PWA is the source of truth** for final UX and navigation. **`apps/mobile` is a phased read-only scaffold** — not a parallel product design.

| Web/PWA (production) | Native today (Phase 2H shell) |
|----------------------|-------------------------------|
| Hub feed (`/hub`) | **Hub** — real **friends** rail (2K) + placeholders + shared smoke |
| **Map** (primary core, `/map`) | **Map** placeholder — no Mapbox/GPS |
| Create / share (center action) | **Create** placeholder — no camera/upload |
| Chat (`/chat`) | **Chat** placeholder — no messages API |
| Profile (`/profile`) | **Profile** (+ 2F read-only `profiles` hydration) |
| Search (integrated in surfaces) | **No fixed Search tab** — integrated search is a later phase |

Visual polish (floating/glass nav) and real map/chat data are **later** phases. Details: [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical).

---

## Phase summary

| Phase | Name | Status | Delivers |
|-------|------|--------|----------|
| **0** | Monorepo migration | **Complete** | `apps/web`, npm workspaces, root install |
| **1** | Shared deterministic engine | **Complete** | `packages/shared`, web shims, production `computePresenceFromGps` |
| **2A** | Native architecture docs | **Complete** | Migration docs under `docs/` |
| **2B** | Mobile scaffold | **Complete** | `apps/mobile`, auth, `@intencity/shared` smoke, Expo Go verified |
| **2C** | Native shell polish | **Complete** | Branded dark UI, safe areas, loading/login/home — auth logic unchanged |
| **2D** | Docs + audit checkpoint | **Complete** | Boundaries reconfirmed; audits pass — **no app logic** |
| **2E** | Native read-only product shell | **Complete** | Bottom tabs + placeholder Home/Search/Activity/Profile — **no data, no GPS** |
| **2F** | Read-only profile hydration | **Complete** | Profile tab reads current user's `profiles` row — **no edit, no presence** |
| **2G** | Web-parity native navigation **plan** | **Complete** | Documented target nav vs 2E scaffold — planning only |
| **2H** | Native nav parity **shell** | **Complete** | Hub / Map / Create / Chat / Profile placeholders — **still read-only** |
| **2I** | Visual parity **shell** | **Complete** | Floating/glass nav, tighter layout, product-like placeholders — **no data/presence changes** |
| **2J** | Read-only data **plan + gates** | **Complete** | Documented ladder **2K–2O** + approved/forbidden table — **docs only**, no new Supabase reads in app |
| **2K** | Friends / social graph | **Complete** | Read-only accepted friends — `friend_requests` + `blocks` + `profiles` (mirrors web `acceptedFriendIdsExcludingBlocks`) |
| **2L** | Venues | **Future** | Read-only venues / discovery data |
| **2M** | Hub feed / moments | **Future** | Read-only hub-style feed **if** RLS + product review say safe |
| **2N** | Chat list | **Future** | Read-only chat threads / previews — no realtime until planned |
| **2O** | Integrated search | **Future** | Read-only search queries (overlay UX; no fixed Search tab) |
| **Post–2O** | Map / GPS / `user_presence` | **Future** | Mapbox, `expo-location`, presence read/write — **explicit approval + [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)** only |

**Renumbering note:** **2F** first product read (own `profiles`). **2K** adds first **social graph** reads (`friend_requests`, `blocks`, `profiles` for friends). **2L–2O** continue the ladder; **Post–2O** for map/presence. Each phase = PR + `rg "\.from\(" apps/mobile` audit.

---

## Next allowed phase (important)

Do **not** add any of the following without a written phase plan, presence-ownership review, and explicit approval:

- `expo-location` or background location
- Geofencing / task-manager location
- Mapbox or map screens tied to live GPS
- `user_presence` **reads** on native — **forbidden** through **2O**; only a **future, explicitly named** phase (post–2O or separate doc) may allow read-only presence **display**
- `user_presence` **writes** (except in a gated beta phase per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))
- Changing production presence ownership

**Safe without a new phase:** mobile UI polish that does **not** add new `supabase.from(...)` beyond **2K**’s approved tables. **2K** allows read-only **`friend_requests`**, **`blocks`**, and **`profiles`** (friend rows + lifecycle filter) for accepted-friends flows only.

**Next implementation phase (when approved):** **Phase 2L** — read-only venues. See [Phase 2K](#phase-2k--read-only-accepted-friends-) and [Planned read-only ladder (2K–2O)](#planned-read-only-data-implementation-phases-not-started).

**Gate:** Native **must not** add new `.from()` tables beyond the **named phase** without updating this doc — [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) rule 9.

---

## Phase 0 — Monorepo migration ✅

**Checkpoint:** `e066023` — stabilized post-feature Phase 0

- `apps/web` is the production Next.js app
- Root `package.json` workspaces: `apps/*`, `packages/*`
- Install from repo root; env at root `.env.local`

**Verify:** `npm run build` from root

---

## Phase 1 — Shared deterministic engine ✅

**Checkpoint:** `2efb525` — Phase 1 finalized cleanup

- `@intencity/shared` — pure TS, 24 unit tests (`npm run test:shared`)
- Web wires `computePresenceFromGps`, freshness shims, heat shim
- **Unchanged:** `AppShell.tsx`, `map/page.tsx`, `notifications.ts`, PWA, schema, RLS
- Web still sole writer of `user_presence`

**Verify:** `npm run test:shared` and `npm run build`

---

## Phase 2A — Native architecture docs ✅

Artifacts: [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md), [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md), this file.

---

## Phase 2B — Mobile scaffold ✅

- `apps/mobile` — Expo + expo-router + expo-dev-client + EAS skeleton
- Supabase auth (`signInWithPassword`) with SecureStore
- Routes: `/login`, tab shell under `/(app)/` (`home`, `search`, `activity`, `profile`)
- `@intencity/shared` smoke on home
- Bundle ID: `com.intencity.app`
- Metro monorepo config (singleton React resolution)
- Verified on device via **Expo Go**

**Out of scope (unchanged):** `user_presence`, `expo-location`, map, push, `apps/web/src` changes

---

## Phase 2C — Native shell polish ✅

**Goal:** Polish the auth shell into a clean Intencity-branded native app **without** new product behavior.

**What changed:**

- Dark / clean Intencity styling (aligned with web tokens: charcoal + electric blue)
- Safe-area-aware layout (`react-native-safe-area-context`)
- Branded loading screen (`AppLoadingScreen` + wordmark)
- Polished sign-in screen (login)
- Polished signed-in home scaffold (account info + Phase 2C copy)
- **Auth logic unchanged** — same Supabase `signInWithPassword` / `signOut`, no `profiles` table reads
- **Shared smoke still present** — subtle `@intencity/shared` lines on home
- Reusable UI primitives under `apps/mobile/src/components/` and `src/theme/colors.ts`

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, background tracking, or geofencing
- No map, push, or hub/chat/stories surfaces
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — loading → login → home → sign out; `npx tsc --noEmit` in `apps/mobile`

---

## Phase 2D — Documentation + audit checkpoint ✅

**Goal:** Update migration docs and re-run audits so the repo clearly reflects Phase 2C completion and safe boundaries before any native feature work.

**Deliverables:** Updated `docs/*`, `apps/mobile/README.md`, root `README.md`; audit log in this section.

### Phase 2D audit results (checkpoint)

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile` app source | ✅ Not present (auth only) |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual (not automated):** Expo Go auth flow on phone — verified during Phase 2B/2C.

---

## Phase 2E — Native read-only product shell ✅

**Goal:** Make the native app **structurally resemble** the Intencity product (tabs + placeholder surfaces) while remaining completely **non-authoritative**.

**What changed:**

- Bottom tab navigator: **Home**, **Search**, **Activity**, **Profile** (`app/(app)/_layout.tsx`) — **migration scaffold only**; production web uses hub / map / create / chat / profile (search integrated, not a fixed tab)
- Placeholder tab screens with Phase 2E copy (no Supabase table queries)
- **Home:** live city / venues + friends preview shell; subtle `@intencity/shared` smoke
- **Search:** friends/venues discovery shell
- **Activity:** stories/notifications shell
- **Profile:** auth user email/id + sign out (moved from old single home screen)
- Reusable shell components: `ShellCard`, `ShellListRow`, `TabScreenHeader`
- `Screen` supports `edges` prop for tab-safe safe areas
- Auth guard unchanged: signed out → login; signed in → `/home` tab shell

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, background tracking, geofencing, Mapbox, or push
- No Supabase `.from()` table reads (auth session only)
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — login → four tabs → profile sign out; `npx tsc --noEmit` in `apps/mobile`

### Phase 2E audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present (placeholder copy in `home.tsx` only) |
| `.from(` in `apps/mobile/app` + `src` | ✅ None |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual:** Expo Go — login → bottom tabs (all four) → profile shows email/id → sign out → login.

---

## Phase 2F — Read-only profile hydration ✅

**Goal:** Safely hydrate native with read-only Supabase product data — **signed-in user's `profiles` row only**.

**What changed:**

- `fetchMyProfile` + `useMyProfile` — `profiles` select for `auth.user.id` only
- Profile tab: username, display name, avatar, bio; loading / empty / error states
- Auth email/user id fallback when row missing or fetch fails
- **No** profile edit, avatar upload, or other table reads

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, background tracking, geofencing, or push
- No friends, venues, stories, messages, or notifications reads
- No changes to `packages/shared` presence timing/windows
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — Profile tab shows hydrated row or auth fallback; `npx tsc --noEmit`

### Phase 2F audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile/src` | ✅ Not present |
| `user_presence` in `apps/mobile/app` | ✅ Placeholder copy only (`home.tsx`, `profile.tsx`) |
| `.from(` in `apps/mobile/src` | ✅ `profiles` only (`fetchMyProfile.ts`) |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual:** Profile tab — data if row exists; auth fallback if not; sign out works.

---

## Phase 2G — Web-parity native navigation plan ✅

**Goal:** Document how native navigation should **converge toward** the deployed web/PWA app — **without** implementing risky product behavior (map engine, GPS, presence, or new Supabase reads).

**Status:** Complete (docs). Implementation delivered in **Phase 2H**.

### Production web/PWA navigation (source of truth)

Reference: `apps/web/src/components/BottomNav.tsx` and related shell.

| Surface | Role |
|---------|------|
| **Hub** (`/hub`) | Home feed — stories, venue energy, social pulse |
| **Map** (`/map`) | **Primary core surface** — map-centered going-out experience |
| **Create** (center) | Stories / share capture |
| **Chat** (`/chat`) | Messages and conversation |
| **Profile** (`/profile`) | Account, moments, settings entry |
| **Search** | Integrated into hub, map, and overlays — **not** a permanent bottom tab on web |

### Current native tabs (temporary — do not extend as canonical)

| Native tab (2E) | Web analogue | Notes |
|-----------------|--------------|--------|
| Home | Hub | Placeholder only |
| Search | Integrated search | **Scaffold only** — web does **not** mirror this as a fixed tab |
| Activity | Chat / activity | Placeholder only |
| Profile | Profile | Phase 2F: read-only own `profiles` row |

### Target native bottom navigation (future — Phase 2H+)

Replace the four-tab scaffold with **web-parity** items:

| Tab | Purpose | Implementation order |
|-----|---------|----------------------|
| **Hub** | Feed / home surface shell | Placeholder first |
| **Map** | Map-centered product shell | **Placeholder shell first** — no Mapbox, no GPS, no venue/presence data |
| **Create** | Share / stories entry | **Placeholder only** until stories/share migration |
| **Chat** | Messages shell | Placeholder first |
| **Profile** | Account (2F hydration continues) | Keep read-only `profiles` |

**Search:** Likely **integrated search** (modal / overlay / per-surface entry) — **not** a permanent bottom tab — matching web. Remove or demote the current Search tab when 2H lands.

Visual direction (later): floating / glass bottom control aligned with web tokens — not required in 2H shell.

### Do not implement yet (2G scope boundary)

| Forbidden in 2G (and in 2H shell without a later phase) | Reason |
|-----------------------------------------------------------|--------|
| Mapbox / map SDK | Map engine is a dedicated phase after shell |
| `expo-location`, live GPS, background location, geofencing | Presence ownership — web remains writer |
| `user_presence` reads or writes | No dual-write; no display without plan |
| Changing `@intencity/shared` timing / activity windows | Cross-platform display contract |
| Independent native IA redesign | Web/PWA is UX source of truth |
| New Supabase table reads (friends, venues, messages, etc.) | **2K–2O** only, one phase per PR + audit ([Phase 2J](#phase-2j--native-migration-read-only-data-plan--gates-)) |

### Deliverables (2G)

- Updated [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) § UX and Phase 2G/2H
- This file — phase table, 2G/2H definitions
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) — nav planning gates
- [apps/mobile/README.md](../apps/mobile/README.md) — target vs temporary tabs

**Verify (2G):** `npm run test:shared`; `cd apps/mobile && npx tsc --noEmit`; `git diff HEAD -- apps/web/src packages/shared` empty for doc-only work.

---

## Phase 2H — Native nav parity shell ✅

**Goal:** Restructure native bottom navigation to match web/PWA **labels and hierarchy** using **placeholder screens only** — still read-only, still non-authoritative.

**What changed:**

- Bottom tabs: **Hub**, **Map**, **Create**, **Chat**, **Profile** (`app/(app)/_layout.tsx`)
- Routes: `hub`, `map`, `create`, `chat`, `profile` — removed `home`, `search`, `activity`
- Signed-in default: `/hub` (login, index, auth layout)
- **Search** removed as a permanent bottom tab (web uses integrated search)
- **Create** tab uses a subtle center-action style (accent circle when focused)
- Placeholder screens for Hub, Map, Create, Chat; Profile keeps Phase 2F `profiles` hydration
- `@intencity/shared` smoke moved to Hub tab

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, GPS, background tracking, geofencing, or push
- No new Supabase table reads — still `profiles` only on Profile
- No changes to `apps/web/src` or `packages/shared` timing constants
- No profile edit or avatar upload on native

**Verify:** Expo Go — login → Hub → five tabs → Profile hydration → sign out; `npx tsc --noEmit`

### Phase 2H audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` | ✅ Not present (placeholder copy only) |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Placeholder copy only (`map.tsx`, `profile.tsx`) |
| `.from(` in `apps/mobile` | ✅ `profiles` only (`fetchMyProfile.ts`) |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

**Manual:** Login → lands on Hub → all five tabs open → Profile shows `profiles` or auth fallback → sign out.

---

## Phase 2I — Visual parity shell ✅

**Goal:** Move native **visual feel** closer to deployed web/PWA (dark premium, glass nav, compact density) without new behavior, data reads, or presence.

**What changed:**

- Floating glass-style bottom tab bar (`FloatingTabBar`) — web-like center Create emphasis
- Tighter screen padding and card density (`layout` tokens, updated `ShellCard` / rows)
- Hub: search pill, moments rail, live places chips, feed sections (placeholders)
- Map: static map canvas with venue dots (no Mapbox/GPS)
- Create: center share hero + action list shell
- Chat: Messages header, search pill, thread list placeholders
- Profile: compact hero, stats row shell, kept 2F `profiles` hydration
- Reduced migration-doc copy on screens

**What did not change:**

- Same 2H routes; no new Supabase reads; no `user_presence`; no location SDKs
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; boundary greps; Expo Go visual pass

---

## Phase 2J — Native migration read-only data plan + gates ✅

**Goal:** Lock a **clear ladder** and **gates** for future native read-only Supabase usage **before** any new `.from()` calls ship. **Docs and process only** — **no** new table reads, **no** UI behavior change, **no** app code in 2J.

**Deliverables:**

- This section + [Planned read-only ladder (2K–2O)](#planned-read-only-data-implementation-phases-not-started)
- [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) — read-only data migration ladder
- [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) — confirms **no** ownership / writer rule changes in 2J
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) — `.from()` gate rule
- [apps/mobile/README.md](../apps/mobile/README.md) — approved access list

### Approved vs forbidden — native Supabase / product data (post–2J)

| Category | Native (until a named phase ships) |
|----------|-----------------------------------|
| **Approved reads** | **`profiles`** — current user only, read-only (`fetchMyProfile` / Profile tab). Auth session APIs (not `.from()`). |
| **Forbidden reads** | **`user_presence`** (and any table not explicitly unlocked in **2K–2O** or later). |
| **Forbidden writes** | All `user_presence` writes; all product writes unless a future gated phase says otherwise. |
| **Forbidden SDKs** | `expo-location`, Mapbox / `@rnmapbox/maps`, background tracking, geofencing, push (until respective phases). |
| **Forbidden shared edits** | Changing `MAP_ACTIVITY_WINDOW_MS`, `RECENT_WINDOW_MS`, `FRIEND_ONLINE_BADGE_MS`, or other `packages/shared` presence constants without a cross-platform plan. |

**Presence display constants (unchanged — do not edit in mobile or shared without migration review):**

| Constant | Value |
|----------|--------|
| `MAP_ACTIVITY_WINDOW_MS` | **20 minutes** |
| `RECENT_WINDOW_MS` | **60 minutes** |
| `FRIEND_ONLINE_BADGE_MS` | **4 minutes** |

**`user_presence` on native:** **Forbidden** for reads and writes through **2O** (and through any read-only social phase) unless a **later, explicitly documented** phase adds read-only presence **display** with its own gate — not part of **2K–2O** as specified here.

### Planned read-only data ladder (2K–2O)

Order is **mandatory** unless this doc is amended with rationale. Each phase: spec tables + RLS + `rg "\.from\(" apps/mobile` audit + `npm run test:shared` + `npx tsc --noEmit`.

| Phase | Focus | Intent |
|-------|--------|--------|
| **2K** | Friends / profile **social graph** | ✅ **Complete** — read-only accepted friends (`friend_requests`, `blocks`, `profiles`); Hub + Profile; **no** `user_presence` |
| **2L** | **Venues** | Read-only venue lists / cards for Hub/Map shells — still **no** Mapbox/GPS |
| **2M** | **Hub feed / moments** | Read-only feed-shaped queries **if** safe under RLS and product review |
| **2N** | **Chat list** | Read-only thread list / previews — **no** full realtime pipeline until planned |
| **2O** | **Integrated search** | Read-only search (friends/places/venues) behind overlay — matches web (no fixed Search tab) |

### Post–2O — map engine, GPS, presence (explicit approval only)

Not part of **2K–2O**. Requires separate plans: dev client, Mapbox SKU, `expo-location`, [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) gates for any `user_presence` read/write, and web regression discipline.

### Phase 2J verify (docs only)

| Check | Expected |
|-------|----------|
| `npm run test:shared` | ✅ Pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `rg "\.from\(" apps/mobile` | ✅ `profiles` only (`fetchMyProfile.ts`) |
| `rg "user_presence|expo-location|mapbox" apps/mobile/app apps/mobile/src` | ✅ No real usage (placeholders may mention strings in copy — avoid adding deps) |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ Empty for doc-only PR |

---

## Phase 2K — Read-only accepted friends ✅

**Goal:** Hydrate native with the same **accepted friends set** as web (`acceptedFriendIdsExcludingBlocks` semantics) — **read-only**, **no** `user_presence`, **no** writes.

**What changed:**

- `fetchAcceptedFriends` + `useAcceptedFriends` — `friend_requests` (accepted) → `blocks` → `profiles` (`account_lifecycle_state = active`), batched `.in()` for profile ids
- Hub **Moments** rail: real friend rings (`FriendHubRing`) after “Your moment”; loading/error/empty copy
- Profile stats: **Friends** count from the same hook

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, push, or new writes
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` grep includes only `profiles`, `friend_requests`, `blocks`

### Phase 2K audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ (run on merge) |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present |
| `.from(` in `apps/mobile` | ✅ `profiles`, `friend_requests`, `blocks` only |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

---

## Architecture diagram

```
Today (post–2K):
  apps/web ──reads/writes──► Supabase (user_presence)  ← production authority
       │
       └──► @intencity/shared

  apps/mobile ──auth──► Supabase (auth session)
       │
       ├──► profiles (own row + accepted friends’ display rows)
       ├──► friend_requests (accepted edges), blocks (exclusions)
       ├──► Tab shell — Hub / Map / Create / Chat / Profile
       └──► @intencity/shared (display smoke on Hub)

After post–2O (gated — not started):
  apps/mobile ──writes──► user_presence (gated)
  apps/web ──reads──► viewer + social
```

---

## Verification commands

From repo root:

```bash
npm run test:shared
npm run build
cd apps/mobile && npx tsc --noEmit
npm run dev:mobile    # Expo Go
```

Boundary greps (source only):

```bash
rg "expo-location|user_presence" apps/mobile/app apps/mobile/src
rg "\.from\(" apps/mobile/app apps/mobile/src
```

---

## Git recovery commands

```bash
git log --oneline e066023..2efb525    # Phase 1
git show aac0193 --stat               # Phase 2B scaffold (if committed)
git diff HEAD -- apps/web/src packages/shared
```
