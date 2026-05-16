# Intencity mobile (Phase 2J — read-only data plan + gates)

Expo native app — **phased read-only scaffold** with web-parity navigation (Phase **2H**), visual polish toward web/PWA (Phase **2I**), and a **documented ladder** for future read-only data (Phase **2J**). Profile hydration (Phase **2F**) is the **only** Supabase `.from()` in code today. **Not** production.

**Web/PWA** (`apps/web`) defines final navigation, behavior, and presence authority. See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md#phase-2j--native-migration-read-only-data-plan--gates-) and [docs/NATIVE_ARCHITECTURE.md](../../docs/NATIVE_ARCHITECTURE.md#read-only-data-migration-ladder-post–2j).

## Approved Supabase access (post–2J — code)

| Source | Scope | Notes |
|--------|--------|--------|
| **`profiles`** | Current user only | `select(username, display_name, bio, avatar_url).eq("id", userId).maybeSingle()` in `src/lib/fetchMyProfile.ts` |
| **Auth** | Session | Supabase Auth APIs only — **not** `.from()` |

**Forbidden until a named phase (2K–2O or post–2O):** any other `supabase.from(...)` / new `.from()` calls. **`user_presence`** — **no reads or writes** on native through **2O** per migration docs.

**Presence windows** (unchanged in `packages/shared`; do not edit for native-only work):

| Constant | Value |
|----------|--------|
| `MAP_ACTIVITY_WINDOW_MS` | 20 minutes |
| `RECENT_WINDOW_MS` | 60 minutes |
| `FRIEND_ONLINE_BADGE_MS` | 4 minutes |

## Planned read-only ladder (documentation — implement in 2K+)

| Phase | Focus |
|-------|--------|
| **2K** | Friends / social graph — read-only |
| **2L** | Venues — read-only |
| **2M** | Hub feed / moments — read-only, if safe |
| **2N** | Chat list — read-only |
| **2O** | Integrated search — read-only |

**Post–2O:** Mapbox, GPS, `user_presence` — explicit approval and presence-ownership gates only.

## Bottom navigation (Phase 2H / 2I)

Floating glass-style tab bar aligned with web/PWA. Icon-only; Create is center-emphasized.

| Tab | Status |
|-----|--------|
| **Hub** | Moments rail, live places chips, feed placeholders + shared smoke |
| **Map** | Static map canvas placeholder — no Mapbox, GPS, or permissions |
| **Create** | Share hero shell — no camera, upload, or stories pipeline |
| **Chat** | Messages list placeholder — no API or realtime |
| **Profile** | Read-only `profiles` row (Phase 2F) + sign out |

**Search** is **not** a permanent bottom tab (matches web integrated search). Integrated search data is **2O**.

Signed-in users land on **Hub** (`/hub`). Production map, chat, stories, and presence remain on web/PWA.

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
- Integrated search queries (planned **2O**)

## Run (reference)

```bash
npm run dev:mobile          # from repo root
```

Or from this directory: `npm run start`.

- **Expo Go** is enough for the current shell + profile read (Phase 2B–2I).
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

Phase 2B–2I works in **Expo Go**. Later phases (Mapbox, background location) will require a **development build** (`expo-dev-client`), not Expo Go alone.

## Current boundaries (post–2J)

| Allowed | Not allowed without named phase + audit |
|---------|-------------------------------------------|
| Auth UI polish | New `.from()` (see [SACRED_FILES_AND_RULES.md](../../docs/SACRED_FILES_AND_RULES.md) rule 9) |
| Sign in / sign out | `user_presence` reads or writes |
| Read own `profiles` row | Other Supabase table reads (**2K+** only) |
| Hub/Map/Create/Chat/Profile placeholders | Mapbox, map engine, live map |
| Shared smoke on Hub | Live hub/chat/stories/messages data |
| | Profile edit / avatar upload on native |
| | Push, geofencing |
| | Fixed Search bottom tab (use integrated search in **2O**) |

**Web** remains the only **physical presence** writer. See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md) and [docs/PRESENCE_OWNERSHIP.md](../../docs/PRESENCE_OWNERSHIP.md).
