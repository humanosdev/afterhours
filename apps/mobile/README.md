# Intencity mobile (Phase 2M — read-only Hub shares)

Expo native app — **phased read-only scaffold** through Phase **2I** shell + **2K** friends + **2L** venues + **2M** Hub **`stories`** (share preview). **Not** production.

**Web/PWA** (`apps/web`) owns live presence, map engine, likes/comments/realtime on shares, and all writes. Native mirrors web Hub **`Shares`** data shape using read-only **`stories`** + **`profiles`** hydration only.

## Approved Supabase `.from()` (post–2M)

| Table | Scope | Module |
|-------|--------|--------|
| **`profiles`** | Own row + accepted friends’ display rows; share owner hydrate for Hub | `fetchMyProfile.ts`, `fetchAcceptedFriends.ts`, `fetchHubFeedPreview.ts` |
| **`friend_requests`** | `status = accepted` edges where current user is requester or addressee | `fetchAcceptedFriends.ts` |
| **`blocks`** | Rows involving current user (blocker or blocked) | `fetchAcceptedFriends.ts` |
| **`venues`** | Read-only preview: `id, name, category, lat, lng` (ordered, capped) — Hub + Map | `fetchVenuesPreview.ts` |
| **`stories`** | Read-only Hub **Shares**: same column filter semantics as web `loadHubFriendShares` (`user_id` in me ∪ friends, `is_share`, visibility flags), limit 200 | `fetchHubFeedPreview.ts` |
| **Auth** | Session | Supabase Auth APIs — **not** `.from()` |

**Still forbidden:** `user_presence` (read/write through **2O** as documented), `expo-location`, Mapbox, writes beyond auth, any table **not** unlocked in **2N+** without updating [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md).

**Presence windows** (unchanged in `packages/shared`):

| Constant | Value |
|----------|--------|
| `MAP_ACTIVITY_WINDOW_MS` | 20 minutes |
| `RECENT_WINDOW_MS` | 60 minutes |
| `FRIEND_ONLINE_BADGE_MS` | 4 minutes |

## Planned read-only ladder (next)

| Phase | Focus |
|-------|--------|
| **2N** | Chat list — read-only |
| **2O** | Integrated search — read-only |

**Post–2O:** Mapbox, GPS, `user_presence` — explicit approval only.

## Bottom navigation (Phase 2H / 2I)

Floating glass-style tab bar aligned with web/PWA. Icon-only; Create is center-emphasized.

| Tab | Status |
|-----|--------|
| **Hub** | **2K** + **2L** + **2M** — Moments, Active friends, Live places, **Shares** (read-only) + shared smoke |
| **Map** | Decorative canvas + **2L** venue name list — **no** Mapbox, GPS, or permissions |
| **Create** | Share hero shell — no camera, upload, or stories pipeline |
| **Chat** | Messages list placeholder — no API or realtime |
| **Profile** | Read-only `profiles` (2F) + **Friends count** (2K) + sign out |

**Search** is **not** a permanent bottom tab. Integrated search data is **2O**.

Signed-in users land on **Hub** (`/hub`). Production map, live heat, chat, stories, moments, and presence remain on web/PWA.

Does not write `user_presence`, read `user_presence`, or use device location.

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
4. Test: **login** → **Hub** (friends, venues, **Shares** list) → **Map** (venue list, no location prompt) → **Profile** → **sign out**.

If the app does not load over LAN (common on guest networks or strict firewalls):

```bash
npm run dev:mobile -- --tunnel
```

Then scan the new QR code (tunnel is slower but works across networks).

### What this phase tests

- Supabase email/password sign-in
- Session persistence (SecureStore)
- Web-parity bottom tabs
- Read-only **`friend_requests`**, **`blocks`**, **`profiles`**, **`venues`**, **`stories`**
- Hub friends rail + live places + **Shares** preview + Profile friend count
- Map static preview + venue names
- Sign out

### What this phase does **not** test

- Maps, GPS, or background location
- `user_presence`
- Live venue heat or friend-near-venue (web/PWA)
- Likes, comments, or share actions on native (web/PWA only)
- Stories **viewer** / moments playback
- Chat threads or realtime
- Profile editing or friend actions (accept/decline) on native

## Run (reference)

```bash
npm run dev:mobile          # from repo root
```

Or from this directory: `npm run start`.

- **Expo Go** is enough for the current shell + reads (Phase 2B–2M).
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

### Hub shows no friend rings (only “Your moment”)

No accepted friends, all friends blocked/inactive, or RLS — add friends on web/PWA or check Supabase.

### Hub “Live places” empty or error

RLS on `venues` for the mobile role, empty table, or network — verify `venues` policy matches web expectations.

### Hub “Shares” empty

No `is_share` rows for you or accepted friends, RLS, or fetch error — post shares on web/PWA or check Supabase `stories` policies.

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

Phase 2B–2M works in **Expo Go**. Later phases (Mapbox, background location) will require a **development build** (`expo-dev-client`), not Expo Go alone.

## Current boundaries (post–2M)

| Allowed | Not allowed without named phase + audit |
|---------|-------------------------------------------|
| Auth UI polish | New `.from()` tables beyond **2N+** without doc update |
| Read `profiles`, `friend_requests`, `blocks`, `venues`, `stories` as documented | `user_presence`, writes |
| Hub/Map/Create/Chat/Profile shells | Mapbox, GPS, live map engine |
| Shared smoke on Hub | Presence freshness UI tied to `user_presence` |

**Web** remains the only **physical presence** writer and the **live map** authority. See [docs/MIGRATION_PHASES.md](../../docs/MIGRATION_PHASES.md) and [docs/PRESENCE_OWNERSHIP.md](../../docs/PRESENCE_OWNERSHIP.md).
