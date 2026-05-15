# Intencity mobile (Phase 2B)

Expo scaffold — **auth only**. Does not write `user_presence` or use location.

## Setup

From the **repository root**:

```bash
npm install
```

Create `apps/mobile/.env` (gitignored) with the same Supabase project as web:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Values match web’s `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in root `.env.local`.

## Run

```bash
npm run dev:mobile
```

Or from this directory: `npm run start`.

- **Expo Go** works for this JS-only scaffold.
- **Development build** (`expo run:ios` / `android`) is configured via `expo-dev-client` for later native modules (Mapbox, etc.).

## Bundle ID

`com.intencity.app` (iOS and Android) — see `app.config.ts`.

## Monorepo

`@intencity/shared` is imported from `packages/shared` via Metro (`metro.config.js`). Home screen shows a harmless shared smoke line.

## Out of scope (2B)

No `user_presence`, no `expo-location`, no map, no push, no `profiles` table reads.

See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md).
