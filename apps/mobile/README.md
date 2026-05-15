# Intencity mobile (Phase 2F — read-only profile)

Expo native app — **phased read-only scaffold** (Phase 2E tabs + Phase 2F profile read). **Not** the production app and **not** the source of truth for product UX.

**Web/PWA** (`apps/web`) defines final navigation (hub, **map**, create, chat, profile; search integrated in surfaces). Native’s current Home / Search / Activity / Profile tabs are **temporary migration placeholders** — they will converge toward web parity, not drive independent IA. See [docs/NATIVE_ARCHITECTURE.md](../../docs/NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical).

Map, venues, stories, chat, and presence remain on web/PWA until later phases.

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
4. Test: **login** → **Profile tab** (username, avatar, bio if set, or auth fallback) → **sign out**.

If the app does not load over LAN (common on guest networks or strict firewalls):

```bash
npm run dev:mobile -- --tunnel
```

Then scan the new QR code (tunnel is slower but works across networks).

### What this phase tests

- Supabase email/password sign-in
- Session persistence (SecureStore)
- Bottom tab navigation (icon-only)
- **Read-only `profiles` fetch** for the signed-in user
- Profile loading / empty / error states
- Auth email/user id fallback
- Sign out

### What this phase does **not** test

- Maps, GPS, or background location
- `user_presence` reads or writes
- Friends, venues, stories, messages, or notifications
- Profile editing or avatar upload on native
- Push notifications
- Physical presence or geofencing

## Supabase reads (Phase 2F)

| Table | Scope | Notes |
|-------|--------|--------|
| `profiles` | Current user only | `select(username, display_name, bio, avatar_url).eq("id", userId).maybeSingle()` |

Auth session uses Supabase Auth APIs only (not `.from()`).

## Run (reference)

```bash
npm run dev:mobile          # from repo root
```

Or from this directory: `npm run start`.

- **Expo Go** is enough for the current shell + profile read (Phase 2B–2F).
- **Development build** (`expo run:ios` / `android`) is for later native modules (Mapbox, background location, etc.).

## Bundle ID

`com.intencity.app` (iOS and Android) — see `app.config.ts`.

## Monorepo

`@intencity/shared` is imported from `packages/shared` via Metro (`metro.config.js`). Home tab shows a harmless shared smoke line; **presence timing windows are unchanged**.

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

Phase 2B–2F works in **Expo Go**. Later phases (Mapbox, background location) will require a **development build** (`expo-dev-client`), not Expo Go alone.

## Current boundaries (post–2F)

| Allowed | Not allowed without new phase plan |
|---------|-------------------------------------|
| Auth UI polish | `expo-location`, background GPS |
| Sign in / sign out | `user_presence` reads or writes |
| Read own `profiles` row | Other Supabase table reads |
| Tab shell + placeholder Home/Search/Activity | Map, live hub/chat/stories data |
| Shared smoke on Home | Profile edit / avatar upload on native |
| | Push, geofencing |

**Web** remains the only **physical presence** writer. See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md) and [docs/PRESENCE_OWNERSHIP.md](../../docs/PRESENCE_OWNERSHIP.md).
