# Intencity

Location-first social app for going out (Next.js + Supabase + Mapbox). Package name: `intencity`.

## Getting Started

The Next.js app lives in **`apps/web`** (npm workspaces). Install from the repo root:

```bash
npm install
```

Keep using **`.env.local` at the repository root** (same as before Phase 0). Point the app at it so Next.js can load secrets:

```bash
ln -sf ../../.env.local apps/web/.env.local
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run dev:clean` | Clear `.next` and restart dev (stale chunk issues) |
| `npm run test:shared` | Unit tests for `packages/shared` pure logic |
| `npm run dev:mobile` | Expo dev server for `apps/mobile` (Phase 2B scaffold) |

## Mobile (`apps/mobile`)

Phase 2B Expo scaffold — auth shell only (no presence writes, no location). See [apps/mobile/README.md](apps/mobile/README.md).

## Shared package (`packages/shared`)

Pure TypeScript helpers (presence windows, venue zone math, heat colors) live in **`@intencity/shared`**. The web app imports them through curated shims under `apps/web/src/lib/` (for example `presence.ts`, `venueHeatColors.ts`, and `computePresenceFromGps` in `userPresenceVenueSync.ts`). Run `npm run test:shared` from the repo root after changing shared code.

## Migration architecture docs

Monorepo → native migration (separate from product phases in `docs/V1_LAUNCH_PLAN.md`):

- [docs/MIGRATION_PHASES.md](docs/MIGRATION_PHASES.md) — phase checklist and git checkpoints
- [docs/NATIVE_ARCHITECTURE.md](docs/NATIVE_ARCHITECTURE.md) — web vs shared vs future `apps/mobile`
- [docs/PRESENCE_OWNERSHIP.md](docs/PRESENCE_OWNERSHIP.md) — who may write `user_presence`
- [docs/SACRED_FILES_AND_RULES.md](docs/SACRED_FILES_AND_RULES.md) — files to avoid casual edits

See `docs/V1_LAUNCH_PLAN.md` for launch scope and status.
