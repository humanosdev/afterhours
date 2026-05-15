# Migration phases (monorepo → native)

**Purpose:** Single source of truth for **engineering migration** phases (monorepo, shared engine, native app). This is **not** the same as product phases in [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) (moderation, admin, launch checklist).

**Current phase:** **Post–2D audit checkpoint** — mobile shell is polished and verified; **no further native feature work** (location, map, presence reads/writes) without an explicit planned phase and approval.

---

## Current mobile status (as of Phase 2D checkpoint)

| Area | Status |
|------|--------|
| **Expo scaffold** | ✅ `apps/mobile` — Expo SDK 54, expo-router, dev client config, EAS skeleton |
| **Supabase auth** | ✅ Email/password, SecureStore session, sign in / sign out |
| **Native shell UI** | ✅ Phase 2C — dark Intencity theme, safe areas, loading / login / home |
| **`@intencity/shared`** | ✅ Harmless smoke on home (`MAP_ACTIVITY_WINDOW_MS`, `isValidCoordinatePair`) |
| **Production presence authority** | ❌ **Mobile is not authoritative** — web/PWA only |
| **`expo-location` / GPS** | ❌ Not installed |
| **`user_presence` reads/writes** | ❌ None |
| **Map / hub / chat / stories** | ❌ Not on mobile — **web/PWA has production UX** |

**Production product today:** `apps/web` (PWA) — map, venues, stories/shares, chat, profile, friends, notifications, and **all** physical presence writes.

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
| **2E+** | Native product features | **Future** | Read-only surfaces, then gated presence — **requires explicit plan** |

**Renumbering note:** Earlier drafts listed “read-only mobile” as 2C and “presence beta” as 2D. **What shipped as 2C** is the polished auth shell only. The next **implementation** phases (read-only data, presence beta, etc.) are **2E+** and must be planned before coding.

---

## Next allowed phase (important)

Do **not** add any of the following without a written phase plan, presence-ownership review, and explicit approval:

- `expo-location` or background location
- Geofencing / task-manager location
- Mapbox or map screens tied to live GPS
- `user_presence` **reads** (except in a dedicated read-only phase plan)
- `user_presence` **writes** (except in a gated beta phase per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))
- Changing production presence ownership

**Safe without a new phase:** mobile UI polish that does not touch location, map, presence tables, or web sacred files.

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
- Routes: `/login`, `/home` (auth user id/email only)
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

## Phase 2E+ — Future native work (not started)

Planned direction (order and numbering TBD when approved):

| Topic | Notes |
|-------|--------|
| **Read-only mobile surfaces** | Optional: read venues, friends, `user_presence` for display — still **no** mobile writes |
| **Foreground presence beta** | Gated `user_presence` writes; requires schema/flag per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) |
| **Background native presence** | Confidence model, OS permissions, likely schema |
| **Web write retirement** | Web stops GPS upserts; mobile becomes authority for opted-in users |

See [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) and [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md).

---

## Architecture diagram

```
Today (post–2C / 2D):
  apps/web ──reads/writes──► Supabase (user_presence)  ← production authority
       │
       └──► @intencity/shared

  apps/mobile ──auth only──► Supabase (auth session)
       │
       └──► @intencity/shared (display smoke only)

Target (2F+ in prior plans):
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
