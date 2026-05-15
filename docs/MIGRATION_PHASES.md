# Migration phases (monorepo → native)

**Purpose:** Single source of truth for **engineering migration** phases (monorepo, shared engine, native app). This is **not** the same as product phases in [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) (moderation, admin, launch checklist).

**Current phase:** **2A** — native architecture documentation only.

---

## Phase summary

| Phase | Name | Status | Delivers |
|-------|------|--------|----------|
| **0** | Monorepo migration | **Complete** | `apps/web`, npm workspaces, root install |
| **1** | Shared deterministic engine | **Complete** | `packages/shared`, web shims, production `computePresenceFromGps` |
| **2A** | Native architecture docs | **Current** | `docs/NATIVE_ARCHITECTURE.md`, `PRESENCE_OWNERSHIP.md`, this file, `SACRED_FILES_AND_RULES.md` |
| **2B** | Mobile scaffold | Future | `apps/mobile`, Expo + dev client skeleton, auth — **no presence writes** |
| **2C** | Mobile + shared, read-only | Future | Import `@intencity/shared`; read map/hub-style data |
| **2D** | Foreground mobile presence beta | Future | Gated mobile `user_presence` writes (beta cohort only) |
| **2E** | Background native presence | Future | Background GPS, confidence-oriented model, likely schema |
| **2F** | Web physical write retirement | Future | Web stops GPS upserts; viewer + social client |
| **Later** | Presence intelligence & scale | Future | Anti-driveby, anti-resident, scaling, App Store hardening |

---

## Phase 0 — Monorepo migration ✅

**Checkpoint:** `e066023` — stabilized post-feature Phase 0

- `apps/web` is the production Next.js app
- Root `package.json` workspaces: `apps/*`, `packages/*`
- Install from repo root; env at root `.env.local`
- No `packages/shared` yet

**Verify:** `npm run build` from root

---

## Phase 1 — Shared deterministic engine ✅

**Checkpoint:** `2efb525` — Phase 1 finalized cleanup

### Commits (oldest → newest after Phase 0)

| Commit | What |
|--------|------|
| `ffc452c` | Add `packages/shared` + tests; web untouched |
| `99eb49f` | Wire `computePresenceFromGps` in `userPresenceVenueSync.ts` |
| `db59947` | Shim `venueHeatColors.ts` → shared heat helper |
| `dcc89e8` | Shim `presence.ts` → shared freshness/coords/constants |
| `2efb525` | Remove transition comments; README shared section |

### Outcomes

- `@intencity/shared` — pure TS, 24 unit tests (`npm run test:shared`)
- Web depends on `"@intencity/shared": "*"`; Next `transpilePackages`
- **Unchanged:** `AppShell.tsx`, `map/page.tsx`, `notifications.ts`, PWA, schema, RLS
- Web still sole writer of `user_presence`

**Verify:**

```bash
npm run test:shared
npm run build
```

---

## Phase 2A — Native architecture docs (current)

**Goal:** Durable docs for Cursor and humans — **no app code**, no `apps/mobile`, no Expo install, no web runtime changes, no DB/RLS changes.

**Artifacts:**

- [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md)
- [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)
- [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) (this file)
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md)

**Exit criteria:** Docs merged; team agrees on gates before 2B.

---

## Phase 2B — Mobile scaffold (future)

- Create `apps/mobile` (Expo + expo-router + dev client + EAS config)
- Supabase auth with secure session storage
- Minimal UI: sign in, signed-in placeholder
- Metro monorepo wiring for `@intencity/shared`

**Explicitly out of scope:**

- `user_presence` writes
- Background location
- Changing `apps/web`

---

## Phase 2C — Mobile imports shared, read-only (future)

- Mobile imports `@intencity/shared` for display logic
- Read `user_presence`, venues, friends from Supabase
- Map/list UI **read-only** — no GPS-driven upserts

**Still out of scope:** physical presence writes, notification emission from mobile

---

## Phase 2D — Foreground mobile presence beta (future)

**Gated** mobile writes when app is foreground.

**Prerequisites (see [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)):**

- `presence_source` / client metadata in DB
- Beta flag + rollback plan
- Single notification path (no web+mobile duplicate)

Web continues writing for non-beta users.

---

## Phase 2E — Background native presence (future)

- Background location tasks (OS permissions, battery policy)
- Confidence-based write policy (design + likely schema)
- Mobile becomes primary writer for beta/production cohorts

Web writes reduced or disabled per cohort — not globally until 2F.

---

## Phase 2F — Web physical write retirement (future)

- Remove web GPS-driven upserts from `AppShell` and `map/page.tsx` (dedicated PRs)
- Web remains: social, stories, chat, discovery, **map viewer** (read DB)
- Optional RLS: restrict `user_presence` upsert to mobile client role

**Sacred files** change only in planned 2F slices — see [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md).

---

## Later (post–2F)

Not scheduled; capture intent only:

- Presence intelligence (dwell, confidence, anti-spoof)
- Anti-driveby / anti-resident heuristics
- Horizontal scaling, notification fan-out
- App Store review hardening, privacy nutrition labels aligned to location use

---

## Architecture diagram

```
Phase 0–1 (now):
  apps/web ──reads/writes──► Supabase (user_presence)
       │
       └──► @intencity/shared (math only)

Phase 2F (target):
  apps/mobile ──writes──► Supabase (user_presence)
       │
       └──► @intencity/shared
  apps/web ──reads──► Supabase (viewer + social)
       │
       └──► @intencity/shared (display only)
```

---

## Git recovery commands

```bash
# Phase 0 baseline
git show e066023 --stat

# Phase 1 range
git log --oneline e066023..2efb525

# What Phase 1 changed
git diff e066023..2efb525 --stat

# Sacred files unchanged in Phase 1
git diff e066023..2efb525 -- apps/web/src/components/AppShell.tsx apps/web/src/app/map/page.tsx apps/web/src/lib/notifications.ts
```

---

## Verification (every phase that touches shared or web build)

From repo root:

| Command | Expect |
|---------|--------|
| `npm run test:shared` | All shared unit tests pass |
| `npm run build` | `apps/web` Next.js build passes |

Manual QA for presence (web): map inner confirm ≥60s, map↔hub handoff, ghost mode, friend notifications — required before 2D+; not automated in repo today.
