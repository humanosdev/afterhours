# Intencity mobile (Phase 2H — web-parity nav shell)

Expo native app — **phased read-only scaffold** with web-parity bottom navigation (Phase 2H) and read-only profile hydration (Phase 2F). **Not** the production app and **not** the source of truth for product UX.

**Web/PWA** (`apps/web`) defines final navigation and behavior. Native matches web **tab structure** with placeholder screens only.

## Bottom navigation (Phase 2H)

| Tab | Status |
|-----|--------|
| **Hub** | Placeholder feed shell + `@intencity/shared` smoke |
| **Map** | Placeholder — no Mapbox, no GPS, no location permissions |
| **Create** | Placeholder — no camera, upload, or stories pipeline |
| **Chat** | Placeholder — no messages API or realtime |
| **Profile** | Read-only `profiles` row (Phase 2F) + sign out |

**Search** is **not** a permanent bottom tab (matches web integrated search). Integrated search UX is a later phase.

Signed-in users land on **Hub** (`/hub`). Production map, chat, stories, and presence remain on web/PWA.

See [docs/NATIVE_ARCHITECTURE.md](../../docs/NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical) and [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md#phase-2h--native-nav-parity-shell-).

Does not write `user_presence`, read presence, or use location.

## Environment

1. Copy the example file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

2. Open root `.env.local` and copy the **same** Supabase values into `apps/mobile/.env`:

| Root `.env.local` (web) | `apps/mobile/.env` (Expo) |
|-------------------------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

**Required variables:**

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- Use the **same** Supabase project as web.
- **Never** put `SUPABASE_SERVICE_ROLE_KEY` or other secrets in mobile env.
- `apps/mobile/.env` and `apps/mobile/.env.local` are gitignored.

## Local testing on your phone (Expo Go)

From the **repository root**:

```bash
npm install
npm run dev:mobile
```

On your **iPhone**:

1. Install **Expo Go** from the App Store.
2. Ensure your phone and Mac are on the **same Wi‑Fi**.
3. Scan the **QR code** shown in the terminal (Camera app or Expo Go).
4. Test: **login** → lands on **Hub** → tap **Map**, **Create**, **Chat**, **Profile** → Profile shows hydrated row or auth fallback → **sign out**.

If the app does not load over LAN (common on guest networks or strict firewalls):

```bash
npm run dev:mobile -- --tunnel
```

Then scan the new QR code (tunnel is slower but works across networks).

### What this phase tests

- Supabase email/password sign-in
- Session persistence (SecureStore)
- Web-parity bottom tabs: Hub, Map, Create, Chat, Profile
- Signed-in default route `/hub`
- **Read-only `profiles` fetch** on Profile tab
- Profile loading / empty / error states
- Sign out
- No location permission prompt

### What this phase does **not** test

- Maps, GPS, or background location
- `user_presence` reads or writes
- Friends, venues, stories, messages, or notifications data
- Profile editing or avatar upload on native
- Push notifications
- Integrated search overlays

## Supabase reads (Phase 2F / 2H)

| Table | Scope | Notes |
|-------|--------|--------|
| `profiles` | Current user only | `select(username, display_name, bio, avatar_url).eq("id", userId).maybeSingle()` |

Auth session uses Supabase Auth APIs only (not `.from()`).

## Run (reference)

```bash
npm run dev:mobile          # from repo root
```

Or from this directory: `npm run start`.

- **Expo Go** is enough for the current shell + profile read (Phase 2B–2H).
- **Development build** (`expo run:ios` / `android`) is for later native modules (Mapbox, background location, etc.).

## Bundle ID

`com.intencity.app` (iOS and Android) — see `app.config.ts`.

## Monorepo

`@intencity/shared` is imported from `packages/shared` via Metro (`metro.config.js`). Hub tab shows a harmless shared smoke line; **presence timing windows are unchanged**.

## Troubleshooting

### “Configuration required” on launch

Missing env vars. Create `apps/mobile/.env` from `.env.example` and set both `EXPO_PUBLIC_*` values.

### Profile tab shows only email / user id

No `profiles` row for this account yet, RLS blocked the read, or fetch failed — check Supabase dashboard and complete onboarding on web.

### Expo Go cannot connect / infinite loading

- Phone and Mac must be on the **same Wi‑Fi** (or use `--tunnel`).
- macOS firewall: allow Node/Metro if prompted.
- Try: `npm run dev:mobile -- --tunnel`

### VS Code: “too many active changes” in Git

Often caused by nested `apps/mobile/node_modules` (thousands of untracked files).

Fix:

```bash
rm -rf apps/mobile/node_modules
npm install    # from repo root only
```

Root `.gitignore` ignores all `node_modules/` and `.expo/`. Prefer **`npm install` at repo root**, not `npx expo install` inside `apps/mobile`, unless you know you need a new native dependency.

### Expo Go vs dev client

Phase 2B–2H works in **Expo Go**. Later phases (Mapbox, background location) will require a **development build** (`expo-dev-client`), not Expo Go alone.

## Current boundaries (post–2H)

| Allowed | Not allowed without new phase plan |
|---------|-------------------------------------|
| Auth UI polish | `expo-location`, background GPS |
| Sign in / sign out | `user_presence` reads or writes |
| Read own `profiles` row | Other Supabase table reads |
| Hub/Map/Create/Chat/Profile placeholders | Mapbox, map engine, live map |
| Shared smoke on Hub | Live hub/chat/stories/messages data |
| | Profile edit / avatar upload on native |
| | Push, geofencing |
| | Fixed Search bottom tab (use integrated search in later phase) |

**Web** remains the only **physical presence** writer. See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md) and [docs/PRESENCE_OWNERSHIP.md](../../docs/PRESENCE_OWNERSHIP.md).
