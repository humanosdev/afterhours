# Migration phases (monorepo → native)

**Purpose:** Single source of truth for **engineering migration** phases (monorepo, shared engine, native app). This is **not** the same as product phases in [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) (moderation, admin, launch checklist).

**Current phase:** **Phase 2F complete** — read-only profile hydration on native Profile tab. **No** `user_presence`, location, or reads beyond current user's `profiles` row without an explicit planned phase.

---

## Current mobile status (as of Phase 2F)

| Area | Status |
|------|--------|
| **Expo scaffold** | ✅ `apps/mobile` — Expo SDK 54, expo-router, dev client config, EAS skeleton |
| **Supabase auth** | ✅ Email/password, SecureStore session, sign in / sign out |
| **Native shell UI** | ✅ Phase 2C — dark Intencity theme, safe areas, loading / login |
| **Product navigation** | ✅ Phase 2E — **temporary** tabs (not final IA); web/PWA nav is source of truth |
| **Profile hydration** | ✅ Phase 2F — read-only `profiles` row for signed-in user on Profile tab |
| **`@intencity/shared`** | ✅ Harmless smoke on Home tab (`MAP_ACTIVITY_WINDOW_MS`) — **windows unchanged** |
| **Production presence authority** | ❌ **Mobile is not authoritative** — web/PWA only |
| **`expo-location` / GPS** | ❌ Not installed |
| **`user_presence` reads/writes** | ❌ None |
| **Supabase table reads** | ✅ `profiles` only (current user, read-only) |
| **Map / hub / chat / stories** | ❌ Shell placeholders only — **web/PWA has production UX** |

**Production product today:** `apps/web` (PWA) — map, venues, stories/shares, chat, profile, friends, notifications, and **all** physical presence writes.

### UX / navigation (do not confuse with production)

**Web/PWA is the source of truth** for final UX and navigation. **`apps/mobile` is a phased read-only scaffold** — not a parallel product design.

| Web/PWA (production) | Native today (temporary 2E shell) |
|----------------------|-----------------------------------|
| Hub feed (`/hub`) | “Home” placeholder |
| **Map** (primary core, `/map`) | Not on native yet |
| Create / share (center action) | Not on native yet |
| Chat (`/chat`) | “Activity” placeholder |
| Profile (`/profile`) | Profile tab (+ 2F read-only hydration) |
| Search (integrated in surfaces) | “Search” tab — **scaffold only**, not web IA |

Long-term: native **converges toward** web — map-centered, floating/glass bottom nav, integrated search, same hierarchy and brand. **Do not** assume or extend the current four native tabs as permanent. Details: [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical).

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
| **2G+** | More read-only data & presence | **Future** | Friends, venues, `user_presence` display, then gated writes — **requires explicit plan** |

**Renumbering note:** Earlier drafts listed “read-only mobile” as 2C and “presence beta” as 2D. **2F** is the first Supabase product read (own profile only). Presence beta and map remain **2G+** and must be planned before coding.

---

## Next allowed phase (important)

Do **not** add any of the following without a written phase plan, presence-ownership review, and explicit approval:

- `expo-location` or background location
- Geofencing / task-manager location
- Mapbox or map screens tied to live GPS
- `user_presence` **reads** (except in a dedicated read-only phase plan)
- `user_presence` **writes** (except in a gated beta phase per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))
- Changing production presence ownership

**Safe without a new phase:** mobile UI polish and read-only shell layout (2E-style) that does not touch location, map, presence tables, or web sacred files. **2F allows** read-only `profiles` for the signed-in user only.

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
- Profile tab: username, display name, avatar, bio, member since; loading / empty / error states
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

## Phase 2G+ — Future native work (not started)

Planned direction (order and numbering TBD when approved):

| Topic | Notes |
|-------|--------|
| **More read-only mobile data** | Friends, venues, optional `user_presence` **display** — still **no** mobile writes |
| **Foreground presence beta** | Gated `user_presence` writes; requires schema/flag per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) |
| **Background native presence** | Confidence model, OS permissions, likely schema |
| **Web write retirement** | Web stops GPS upserts; mobile becomes authority for opted-in users |

See [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) and [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md).

---

## Architecture diagram

```
Today (post–2F):
  apps/web ──reads/writes──► Supabase (user_presence)  ← production authority
       │
       └──► @intencity/shared

  apps/mobile ──auth──► Supabase (auth session)
       │
       ├──► profiles (read own row only)
       ├──► Tab shell — Home/Search/Activity placeholders; Profile hydrated
       └──► @intencity/shared (display smoke on Home)

Target (2G+ presence):
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
