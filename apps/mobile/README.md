# Intencity mobile (Era 1 — **Mirror** PWA)

Expo native app — **Phase 2 cutover:** native is the **sole `user_presence` writer** when the app is foregrounded ([NATIVE_CUTOVER.md](../../docs/NATIVE_CUTOVER.md)). Web product presence upserts are disabled; use native for location.

> **Doctrine:** Native must eventually do **everything** the production PWA does, with the **same visual identity** and equal-or-better feel — **parity = exact user-facing equivalence**, not rough similarity ([Native Product Equivalence Doctrine](../../docs/MIGRATION_PHASES.md#native-product-equivalence-doctrine), [audit §11](../../docs/PWA_NATIVE_PARITY_AUDIT.md#11-full-parity-backlog-master)). **`VP-1` and `P2O-A` are scaffolds/engine only — not visual or product parity.**

**VP-1 parity routes:** see [PWA_NATIVE_PARITY_AUDIT.md §20–§21.2](../../docs/PWA_NATIVE_PARITY_AUDIT.md#20--vp-2-re-audit-remaining-native-parity-debt-2026-05-17). **`/search-discovery`** + **map tab** received VP-2 flagship chrome pass (2026-05-17). **6** `ParityPlaceholderScreen` routes remain.

Open **Profile → ⋯** for shortcuts; Hub share cards open **`/moments/[id]`**; Messages rows open **`/chat/[id]`** (READ-SOCIAL-1 read-only history — no send yet). After pulling thread changes, run **`npx expo start --clear`** so Metro does not serve the old placeholder shell.

**Era model:** [PRODUCTION_ERA_MODEL.md](../../docs/PRODUCTION_ERA_MODEL.md) — **`P2O-D` (writes) = Era 2 only**, after you sign off native ≥ PWA.

**Implementation gate:** **`CHAT-1`✅** · **`REALTIME-1`✅** · **`NOTIF-1`✅** · **`MEDIA-1`✅** · **`SETTINGS-1`✅** · **`BLOCKS-1`✅**. Next Era 1: sign-off → Era 2 cutover. Notifications authority: **`NOTIF-2/3`** with **`P2O-D`** ([NOTIF_ERA_PLAN.md](../../docs/NOTIF_ERA_PLAN.md)).

## Approved Supabase `.from()` (through **VP-2** reads/writes in use)

**`P2O-A`** reuses **`fetchVenuesPreview.ts`** — same **`venues`** projection as Hub / Map list.

**VP-2 social interactions** (Hub shares + `/moments/[id]`): **`story_likes`**, **`story_comments`** — read/write for likes, comments, hide/delete on **`stories`** only.

| Table | Scope | Module |
|-------|--------|--------|
| **`profiles`** | Own row + accepted friends + chat counterpart hydrate | `fetchMyProfile.ts`, `fetchAcceptedFriends.ts`, `fetchHubFeedPreview.ts`, `fetchChatPreviews.ts` |
| **`friend_requests`** | `status = accepted` edges where current user is requester or addressee | `fetchAcceptedFriends.ts` |
| **`blocks`** | Rows involving current user (blocker or blocked) | `fetchAcceptedFriends.ts` |
| **`venues`** | `id, name, category, lat, lng` (ordered, capped) — Hub rail + Map list + **`P2O-A`** map pins | `fetchVenuesPreview.ts` |
| **`stories`** | Hub shares + moment detail; hide/delete owner shares | `fetchHubFeedPreview.ts`, `fetchMomentDetail.ts`, `hubShareMutations.ts` |
| **`story_likes`** | Hub + moment detail like counts/state | `storyFeedInteractions.ts`, `hubShareMutations.ts` |
| **`story_comments`** | Hub previews + comments sheet + moment detail | `storyFeedInteractions.ts`, `ShareCommentsBottomSheet.tsx` |
| **`chats`** | Chats where the signed-in user is **`user1_id`** or **`user2_id`** | `fetchChatPreviews.ts` |
| **`messages`** | List previews + thread history + **send** insert | `fetchChatPreviews.ts`, `fetchChatThread.ts`, `sendChatMessage.ts` |
| **`notifications`** | Feed browse (NOTIF-1); native creates likes, comments, FR accepted, DMs (NOTIF-2/CHAT-1) | `createNotification.ts`, `fetchNotificationFeed.ts` |
| **`user_presence`** | Read-only rows for map/hub/live-places (**P2O-C**) | `fetchUserPresence.ts` |
| **Auth** | Session | Supabase Auth — **not** `.from()` |

**Forbidden in Era 1:** **`user_presence` writes** (**`P2O-D` / Era 2**), unsolicited **new** `.from(...)` without a named slice, dual-write with web.

**Allowed in Era 1:** **`user_presence` read**, **`expo-location`**, map/presence **display**, gated product writes per slice (stories, likes, …).

**Phase 2O client helpers** (no `.from()`): **`localSearch`**, **`useLocalSearchQuery`**, **`useDebouncedValue`**.

**Presence windows** (P2O-D in `packages/shared` — see [PRESENCE_WINDOWS_P2O_D.md](../../docs/PRESENCE_WINDOWS_P2O_D.md)):

| Constant | Value |
|----------|--------|
| `FRIEND_ONLINE_BADGE_MS` | 2 minutes |
| `HEAT_ACTIVITY_WINDOW_MS` | 8 minutes |
| `MAP_ACTIVITY_WINDOW_MS` | 12 minutes |
| `RECENT_WINDOW_MS` | 30 minutes |
| `INNER_CONFIRM_MS` | 90 seconds |

**Read polls** (Phase 3 — `backgroundReadPolicy.ts`): hub 20s / map 3s / clocks 10s / chat+unread 15s / live places 20s.

### Implementation roadmap (strict order)

| Slice | Focus |
|-------|--------|
| **`P2O-A/B/C`** | Map engine + GPS + presence **read** — **done** ✅ |
| **`MAP-B/C`** | Friends, heat, venue sheet, polish — **done** ✅ |
| **CHAT-1** | Thread send — **done** ✅ |
| **REALTIME-1** | Chat live thread + list — **done** ✅ |
| **MEDIA-1** | Moment/share interactive crop + profile avatar upload — **done** ✅ |
| **SETTINGS-1** | Supabase notification prefs + private account + pause/delete — **done** ✅ |
| **BLOCKS-1** | Unblock on `/blocks` — **done** ✅ |
| **NOTIF-1** | Notifications feed **browse** — **not** system parity |
| **`NOTIF-2/3`** | Notification authority + badges/toasts — **Era 2** with **`P2O-D`** |
| **`NOTIF-4`** | Device push — **Era 3** |
| **`P2O-D`** | **`user_presence` writes** — **Era 2 only** ([PRODUCTION_ERA_MODEL.md](../../docs/PRODUCTION_ERA_MODEL.md)) |

## Bottom navigation (**`VP-1`** + **2O** data)

Floating glass-style tab bar (icon-first). Center tab is branded **Moments** on-device (Expo route file: `create`).

| Tab | Status |
|-----|--------|
| **Hub** | **2K** + **2L** + **2M** + **2O** search — Moments rail, Active friends, Live places, Shares |
| **Map** | Mapbox + GPS + presence markers + heat/glow + venue sheet (**dev build** for Mapbox) |
| **Moments** | Center (`create.tsx`) → composer — **MEDIA-0.1** library pick + upload (no live camera; MEDIA-1) |
| **Chat** | **2N** + **2O** search → **`/chat/[id]`** scaffold (**no realtime / send**) |
| **Profile** | **2F** + **Friends** (**2K**) + overflow shells + sign-out |

Integrated **2O** search on Hub · Chat · Map — **no** standalone Search tab requirement.

Signed-in **`(app)`** uses **`expo-router` `Stack`**: **`(tabs)`** + parity siblings (`/friends`, legal shells, etc.) mirroring web IA without implying parity-complete behavior (**`ParityPlaceholderScreen`** where noted).

Signed-in landing: **Map** (`/map`). Hub remains available from the tab bar.

## Environment

1. **`cp apps/mobile/.env.example apps/mobile/.env`**
2. Copy root **`.env.local`** Supabase vars:

| Root `.env.local` (web) | `apps/mobile/.env` (Expo) |
|-------------------------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

**Required**

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Mapbox (`P2O-A`)

```bash
# Public Mapbox token (starts with pk.) — same style of token as typical Mapbox GL / web setups.
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.…your_token…
```

- Without this variable, **Map** keeps the **static / decorative preview** (still **`venues`** list from Supabase).
- **Never** commit service tokens or secrets intended for downloads CI unless your team explicitly wires that flow (prefer env + EAS secrets).
- **`@rnmapbox/maps`** **Expo config plugin** is registered in **`app.config.ts`**. Changing native Mapbox wiring requires **`npx expo prebuild`** (clean ios/android dirs) whenever you regenerate native projects.

### Optional CI / Gradle (downloads)

Some Mapbox Android builds still respect **`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`** / **`MAPBOX_DOWNLOADS_TOKEN`** env / `gradle.properties` entries if your workspace policy requires authenticated downloads — see **`@rnmapbox/maps`** install notes. Not required for all accounts; keep tokens out of git.

---

## Expo Go (**shell + reads**)

From repo root:

```bash
npm install
npm run dev:mobile
```

**Expo Go** bundles **none** of the **`@rnmapbox/maps`** native libraries — **`RNMBXModule` is absent** → the JS wrapper **never loads** Mapbox (**by design**) so Expo Go stays stable. Expect the **glass Map chrome + venue list** with the **fallback canvas** ribbon.

Smoke: login → Hub → Map (fallback + **`venues`**) → Chat → Profile → sign-out.

Tunnel if LAN blocks QR: **`npm run dev:mobile -- --tunnel`**.

---

## Native Mapbox (**development build** — required for real map tiles)

Interactive Mapbox **`MapView`** needs a **custom dev client** (`expo-dev-client` is already in the project):

**One-time native generation & build**

```bash
cd apps/mobile
# Ensure `.env` has EXPO_PUBLIC_* vars + EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
npx expo prebuild
```

Then **iOS** (Simulator or device):

```bash
cd apps/mobile
npx expo run:ios
```

**Android:**

```bash
cd apps/mobile
npx expo run:android
```

After install, start Metro from repo root (**`npm run dev:mobile`**) and open the **dev build** app (not Expo Go). **`expo start --dev-client`** flow applies.

**Rebuild** whenever **`app.config.ts` plugins**, Mapbox Gradle/Pod knobs, or other native deps change.

---

### Quick verification commands (engineering)

From repo root + `apps/mobile`:

```bash
npm run test:shared
cd apps/mobile && npx tsc --noEmit
rg '\.from\(' apps/mobile
```

---

## Troubleshooting

### “Configuration required” / missing Supabase

Create **`apps/mobile/.env`** — both **`EXPO_PUBLIC_SUPABASE_*`** required.

### Map stays decorative despite token

Usually **Expo Go** limitation — switch to **`expo run:ios`** / **`expo run:android`** dev build. Rarely: typo in **`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`** (must be non-empty `pk.`).

### Pods / Gradle Mapbox failures

Re-run **`npx expo prebuild --clean`** (destructive to generated `ios/` & `android/` — intentional for regen workflows), confirm Xcode / Android toolchain versions match Expo SDK 54 docs.

### VS Code: too many Git changes (`apps/mobile/node_modules`)

```bash
rm -rf apps/mobile/node_modules && npm install   # repo root only
```

---

## Run (reference)

```bash
npm run dev:mobile     # repo root → Metro + dev-client / Expo Go QR
```

`apps/mobile` also exposes **`npm run start`**, **`npm run ios`**, **`npm run android`**.

---

## Bundle ID · monorepo

- **Bundle / application id:** **`com.intencity.app`** — `app.config.ts`
- **`@intencity/shared`** via **`metro.config.js`** — Hub shows harmless shared smoke (**timing constants unchanged deliberately**).

---

## Current boundaries (Era 1 — Mirror)

| OK in Era 1 | Era 2 / gated slice |
|-------------|---------------------|
| **`P2O-C`** presence **read** + map display | **`user_presence` writes** (`P2O-D`) |
| **`P2O-B`** foreground GPS | Web product routes retired |
| **`MAP-B/C`** + Live Places | — |
| REALTIME-1 + mirror backlog | Per [parity audit §11](../../docs/PWA_NATIVE_PARITY_AUDIT.md#11-full-parity-backlog-master) |

Canonical model: [**PRODUCTION_ERA_MODEL.md**](../../docs/PRODUCTION_ERA_MODEL.md) · [**MIGRATION_PHASES.md**](../../docs/MIGRATION_PHASES.md) · [**PRESENCE_OWNERSHIP.md**](../../docs/PRESENCE_OWNERSHIP.md).
