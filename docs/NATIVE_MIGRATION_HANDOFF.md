# Native migration — full handoff (new chat bootstrap)

**Purpose:** One document so a **new Cursor chat** has full context on Intencity PWA → native migration without re-reading prior threads.

**Last updated:** 2026-05-17 (post doctrine formalization; pre–System Truth Audit file).

**Authoritative repo docs (read these for detail):**

| Doc | Role |
|-----|------|
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) | Phase order, gates, VP-2 / P2O slices |
| [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) | Who writes `user_presence`; single-writer rule |
| [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) | Mobile stack, UX source of truth |
| [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) | Shared constants, `.from()` audit rule |
| [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) | Per-surface backlog (§11 master); §16 VP-2 sign-off |
| **This file** | Session handoff + doctrine + recent work |

---

## 1. Product goal (binding)

**`apps/mobile` must eventually do everything production `apps/web` (PWA) does** — same visual identity, same behavior semantics, equal-or-better feel. **Parity = exact user-facing equivalence**, not “inspired by” or scaffold-only.

**`apps/web` remains production and UX source of truth** until native is authorized for each capability (especially presence writes).

**Native-only implementation rule:** Changes for native migration go in **`apps/mobile/**`** (and docs when asked). **Do not modify `apps/web/**`** or **`packages/shared`** presence constants unless explicitly approved for a named slice.

**No commits** unless the user explicitly asks.

---

## 2. Current phase (as of handoff)

| Item | Status |
|------|--------|
| Phases **2K–2O** (read ladder) | ✅ Complete |
| **`P2O-A`** (Mapbox + read-only `venues`) | ✅ Complete |
| **`VP-2A` / `VP-2B` / `VP-2C`** | ✅ Complete |
| **`VP-2`** (atmospheric visual parity) | **In progress — NOT signed off** |
| **`VP-2D`** (glass tint, hub/map chrome closure) | **Next visual slice** per MIGRATION_PHASES |
| **`P2O-B`** (`expo-location`) | **PAUSED** until VP-2 sign-off |
| **`P2O-C`** (`user_presence` read) | Not started |
| **`P2O-D`** (`user_presence` write, gated) | Not started |

**Official implementation order (unchanged):**

```
VP-2D → device QA vs deployed PWA → VP-2 sign-off (document in MIGRATION_PHASES)
  → System Truth Audit (blocking)
  → clarification resolution
  → P2O-B planning
  → P2O-B implementation
  → P2O-C → P2O-D
```

---

## 3. Core migration philosophy (formalized 2026-05-17)

**This does NOT change phase order, ownership gates, writer rules, or rollout sequence.** It clarifies **how** native evolves during P2O-B/C/D.

### Three layers

| Layer | Name | When | Rule |
|-------|------|------|------|
| **A** | **Parity first** | **P2O-B, P2O-C, P2O-D** | Native must behave **identically** to PWA for presence, online, venue activity, checkpoints, heat, ghost, stale windows, sorting, visibility, polling cadence, location UX — **even if** PWA uses browser workarounds or heuristics |
| **B** | **Shared canonical engines** | After parity stabilizes per surface | Move logic into `@intencity/shared`; web + native consume same truth engine |
| **C** | **Native surpasses PWA** | After parity + unified engines + low drift risk | Better GPS, adaptive polling, confidence, anti-jitter, background — **product-approved** |

### No-drift policy (Phase A)

Native must **NOT**:

- Simplify or reinterpret social/geography semantics
- Invent native-only rules (ghost, checkpoint sort, online windows)
- Silently change thresholds or polling cadence
- “Optimize” during migration

If uncertain: **state uncertainty**, cite exact PWA source, **pause** — do not guess.

### Trust principle

Intencity is a **social geography engine**. Users must trust who is where, what is live vs dead, what “inside” means, venue energy, friend presence. Map inaccuracy destroys trust quickly.

### PWA limitations vs product semantics

Before/during P2O-B, classify each behavior as:

- **CANON** — intentional product semantics (match until product changes shared constants)
- **HEUR** — tuned constant (freeze during migration)
- **WEB-WA** — browser workaround that still defines **current** UX
- **TEMP** — known compromise
- **UNK** — not verified — block port

**Planned doc (not yet created):** `docs/SYSTEM_TRUTH_AUDIT.md` — full audit of location, presence, online, heat, checkpoint, polling, ghost, venue classification, map ordering (see §10 below).

---

## 4. Presence ownership (critical)

**One sentence:** Exactly **one client** performs physical `user_presence` upserts per user session unless a gated beta says otherwise.

| Today | Owner |
|-------|--------|
| Zone math, windows, heat ramp | `packages/shared` |
| GPS + upserts + notifications | **`apps/web` only** |
| Write path | `apps/web/src/lib/userPresenceVenueSync.ts` |
| Ghost upsert shape | `apps/web/src/lib/userPresenceWrite.ts` |
| Shell GPS | `AppShell.tsx` — **12s** `getCurrentPosition`, **skips `/map`** |
| Map GPS | `apps/web/src/app/map/page.tsx` — `watchPosition` + sync |
| Mobile | **No** `expo-location`, **no** `user_presence` read/write |

**Future:** Mobile becomes writer; web reads. **Confidence-based** presence is future native — **not** in shared/web today.

### Shared time windows (`packages/shared/src/presence/constants.ts`)

| Constant | Value | Typical use |
|----------|-------|-------------|
| `FRIEND_ONLINE_BADGE_MS` | **4 min** | “Online now”, hub active friends |
| `MAP_ACTIVITY_WINDOW_MS` | **20 min** | Live at venue, heat participation |
| `RECENT_WINDOW_MS` | **60 min** | “Recent” tier |
| `INNER_CONFIRM_MS` | **60 s** | `inner_pending` → `inner_confirmed` |
| `NEARBY_THRESHOLD_M` | **300 m** | Shared constant (verify notification path vs literal in sync) |

Web re-exports + social copy: `apps/web/src/lib/presence.ts` (`getFriendSocialActivitySubtitle`, etc.).

**Do not change shared constants during migration without explicit approval.**

---

## 5. P2O slice definitions (canonical)

### P2O-A ✅ (complete)

- `@rnmapbox/maps`, read-only **`venues`** from catalog `lat`/`lng`
- **No** `expo-location`, **no** `user_presence`, **no** heat/filters/GPS puck at parity level
- Requires **expo-dev-client** for real map (Expo Go = fallback canvas)

### P2O-B (paused)

- Foreground **`expo-location`**
- Map: user puck, Locate cycle, checkpoint **distance** (local GPS only)
- **Default: still NO `user_presence` writes** unless explicitly merged and documented
- Request permission with first feature that uses location (not standalone permission phase)

### P2O-C (not started)

- Read-only **`user_presence`** for display (friend dots, heat UI, live counts)
- New `.from("user_presence")` + RLS/realtime review + audit

### P2O-D (not started)

- Native **`user_presence` writes** — gated beta, `presence_source` metadata, single writer, rollback
- Web GPS writer retires **per cohort** — **dual-write is highest operational risk**

---

## 6. PWA source-of-truth map (live systems — read-only for native ports)

| System | Primary PWA files |
|--------|-------------------|
| Map page (GPS, checkpoint, heat, poll) | `apps/web/src/app/map/page.tsx` |
| Presence sync | `apps/web/src/lib/userPresenceVenueSync.ts` |
| Presence writes / ghost | `apps/web/src/lib/userPresenceWrite.ts` |
| Zone math | `packages/shared/src/venue/computePresenceFromGps.ts` |
| Realtime | `apps/web/src/lib/userPresenceRealtime.ts` |
| Hub online/live strip | `apps/web/src/app/hub/page.tsx` |
| Live places | `apps/web/src/app/live-places/page.tsx` |
| Non-map shell GPS | `apps/web/src/components/AppShell.tsx` (12s ping, skip map) |
| Freshness helpers | `packages/shared/src/presence/freshness.ts` |

### Key PWA polling / timing (verify in audit)

| Surface | Interval / behavior |
|---------|---------------------|
| Map presence load | **3s** when tab visible (+ realtime hybrid) |
| Map UI tick | **15s** `presenceClock` |
| AppShell (non-map) | **12s** geolocation ping |
| Hub presence | **45s** poll + **15s** UI tick |
| Live places | **25s** presence poll |
| Auto-tour (map) | `AUTO_TOUR_IDLE_GRACE_MS` 20s, `AUTO_TOUR_REPEAT_MS` 4s, pause 2200ms |
| Checkpoint sort | Activity desc, then distance from user |

### Locate behavior (map)

**Two-tap locate cycle** — not single recenter. Priority stack includes venue sheet, checked-in venue, GPS (see `runLocateCycle` in map page).

### Ghost

`profiles.ghost_mode` + ghost-safe upsert; friends must not see venue when ghost on.

### GPS denied (map)

PWA does **not** invent fake coords for “you”; keeps last real fix. Native must match.

---

## 7. Mobile app state (implementation)

### Stack

- **Expo SDK 54**, **expo-router**, **`apps/mobile`**
- Auth: Supabase + **SecureStore**
- Map: **`@rnmapbox/maps`** when token + dev build; else decorative fallback
- Theme: dark Intencity tokens, glass (`expo-blur`, `expo-linear-gradient`), Lucide tabs

### Approved `.from()` tables (approximate — grep before trusting)

`profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `story_likes`, `story_comments`, `chats`, `messages` — plus Auth.

**Forbidden until named slice:** `user_presence`, `notifications` (mostly), `push_subscriptions`, etc. See parity audit §21.

**Verify:** `rg '\\.from\\(' apps/mobile`

### Navigation

- Tabs: `hub`, `map`, `create` (Moments), `chat`, `profile`
- Stack pushes: `/friends`, `/chat/[id]`, `/moments/[id]`, `/u/[username]`, settings, legal, venue routes, etc.
- **`ParityPlaceholderScreen`** component still exists but **no routes use it** (as of recent sweep)

### Route inventory (`apps/mobile/app/`)

**Tabs:** `(tabs)/hub`, `map`, `create`, `chat`, `profile`

**Stack (examples):** `friends`, `blocks`, `notifications`, `search-discovery`, `archive-hidden`, `live-places`, `venue-activity`, `venue-detail`, `profile-edit`, `settings/*`, `chat/[id]`, `moments/[id]`, `u/[username]`, `shares/new`, auth routes, `privacy`, `terms`, `guidelines`

---

## 8. Recent session work (chat history summary)

### Map VP-2 chrome (native)

- **Symmetric chrome gap:** `MAP_CHROME_EDGE_GAP_PX` / `mapTopOverlayPaddingTop()` in `apps/mobile/src/shell/tabBarMetrics.ts` — top overlay aligns with checkpoint–tab-bar spacing
- **Category glyphs:** `MapCategoryGlyph.tsx`, filter tray, pins, glass pills, secondary controls (Locate/Friends/Ghost row layout)
- **Files:** `apps/mobile/app/(app)/(tabs)/map.tsx`, `src/components/VenuesMapCanvas.tsx`, `src/components/map/*`, `mapDayChrome.ts`, `mapChrome.ts`

**Still deferred (P2O):** GPS puck, heat layers, presence-driven counts, realtime on map, full checkpoint/auto-tour logic

### VP-2 route sweep (placeholders → shells)

| Route | Implementation |
|-------|----------------|
| `/archive-hidden` | Grid, restore, delete — `fetchHiddenShares.ts` |
| `/venue-activity`, `/venue-detail` | `VenueActivityScreen.tsx` + `fetchVenueById.ts` |
| `/live-places` | `LivePlacesScreen.tsx` — catalog + honest “needs presence” notice |
| Hub Live Places “All” | `router.push("/live-places")` |

### VP-2 cleanup fixes

1. **Signup** (`signup.tsx`) — was disabled; now live Temple email signup mirroring PWA (`ensureProfile.ts`)
2. **Friends routing** — public profile “Friends” → `/friends?view={username}` via `fetchFriendsListForViewer.ts`; own profile → `/friends`
3. **Blocks privacy** — `useOwnerOnlyRoute` on `blocks.tsx`; Blocked tab only on own friends header

### Reverted (per user request)

- `mapShellChrome.ts`, dev revision logging, two-line checkpoint “locating…” subtitle

### Typecheck

`cd apps/mobile && npx tsc --noEmit` — passed after cleanup fixes

---

## 9. What is still partial / NO-GO for P2O-B

Per [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) (§21–§23 may be **partially stale** — cross-check device QA):

| Area | Gap |
|------|-----|
| **VP-2 sign-off** | Not documented complete in MIGRATION_PHASES |
| **Map** | Chrome improved; **no** GPS, heat, presence, full checkpoint/auto-tour |
| **Chat** | Thread shell; **no send, no realtime** |
| **Notifications** | Weak / table largely blocked |
| **FoF / suggested friends** | Empty / not wired |
| **Presence-driven UI** | Static zeros / notices until P2O-C |
| **Create** | Library upload path; no full camera pipeline |
| **Realtime** | Not on native for chat/presence |

**P2O-B readiness:** **NO-GO** until VP-2 sign-off + System Truth Audit + clarifications.

**Audit doc staleness:** §22–23 may still list signup disabled / 6 placeholders — **superseded** by §8 above; update audit on next docs pass.

---

## 10. System Truth Audit — **initial audit written**

**Blocking gate before P2O-B implementation.** See **[SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md)** (2026-05-17 initial). Expand UNK rows before P2O-B code.

**Original proposed structure (for extensions):**

1. Classification legend (CANON / HEUR / WEB-WA / TEMP / UNK)
2. Global constants registry
3. Per-system sheets (A–G: implementation, PWA files, UX, classification, trust risk, drift risk, P2O slice, Phase B/C notes)
4. Cross-surface read/write matrix
5. Native porting map
6. Open questions
7. Phase B/C backlog

**Chapters:** (1) location acquisition, (2) presence write path, (3) online/live/recent, (4) heat, (5) checkpoint/auto-tour, (6) realtime+polling, (7) visibility/foreground, (8) stale/dead zones, (9) venue zones, (10) ghost, (11) map ordering/filters

---

## 11. Pre–P2O-B checklist

### Gate 0 — VP-2

- [ ] VP-2D visual items closed or waived
- [ ] Device QA: Hub, Map, Profile, Search, Auth vs **deployed PWA** (signed-in)
- [ ] `MIGRATION_PHASES.md` VP-2 sign-off recorded

### Gate 1 — System Truth Audit

- [ ] `docs/SYSTEM_TRUTH_AUDIT.md` complete for all 11 domains
- [ ] All UNK rows resolved or waived
- [ ] Native porting map per audit row

### Gate 2 — Clarifications

- [ ] P2O-B scope: GPS + map UX only, **no `user_presence` write** (unless explicit merge)
- [ ] P2O-D beta: metadata, single-writer, notifications
- [ ] RLS/realtime for P2O-C read

### Gate 3 — P2O-B plan

- [ ] PR breakdown, parity test plan, no-write guards

### Then: P2O-B code

---

## 12. High drift-risk systems (document carefully)

1. Online (4m) vs live (20m) vs recent (60m) — different UI strings
2. Inside / nearby / outside + `INNER_CONFIRM_MS`
3. Checkpoint sort (activity → distance)
4. Locate two-tap cycle
5. Ghost DB shape + map filtering
6. Map vs AppShell GPS split (no double-write on map)
7. Heat vs category pin color
8. Hub active friends vs live-places sort filters
9. Polling + realtime together
10. Non-friend visibility rules on map people buckets

---

## 13. Key file paths (quick reference)

### Docs

- `docs/MIGRATION_PHASES.md`
- `docs/PRESENCE_OWNERSHIP.md`
- `docs/NATIVE_ARCHITECTURE.md`
- `docs/SACRED_FILES_AND_RULES.md`
- `docs/PWA_NATIVE_PARITY_AUDIT.md`
- `docs/NATIVE_MIGRATION_HANDOFF.md` (this file)

### Mobile entrypoints

- `apps/mobile/app/(app)/(tabs)/map.tsx`
- `apps/mobile/app/(app)/(tabs)/hub.tsx`
- `apps/mobile/app/(auth)/signup.tsx`, `login.tsx`
- `apps/mobile/app/(app)/friends.tsx`, `blocks.tsx`
- `apps/mobile/src/components/map/*`
- `apps/mobile/src/shell/tabBarMetrics.ts`
- `apps/mobile/src/lib/fetchVenuesPreview.ts`, `userPresence*` — **must not exist yet**

### Shared

- `packages/shared/src/presence/constants.ts`
- `packages/shared/src/presence/freshness.ts`
- `packages/shared/src/venue/computePresenceFromGps.ts`

### PWA (read-only for ports)

- `apps/web/src/app/map/page.tsx`
- `apps/web/src/app/hub/page.tsx`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/lib/userPresenceVenueSync.ts`

---

## 14. Agent instructions for new chat

When the user continues migration work:

1. **Read** `MIGRATION_PHASES.md` current gate + this handoff.
2. **Respect** phase order: no P2O-B until VP-2 sign-off + Truth Audit unless user explicitly overrides.
3. **Phase A discipline:** mirror PWA exactly for live systems; cite PWA files.
4. **Native-only** code changes unless user approves web/shared edits.
5. **No** `user_presence` or `expo-location` without named slice.
6. **Do not** commit unless asked.
7. If implementing VP-2: visual/UX only — no new `.from()`, no presence, no GPS.
8. If user asks for Truth Audit: create `docs/SYSTEM_TRUTH_AUDIT.md` per §10 — **do not guess** behaviors.

### Suggested first message in new chat

> Read `docs/NATIVE_MIGRATION_HANDOFF.md` and `docs/MIGRATION_PHASES.md`. Continue from current gate: [VP-2D / Truth Audit / P2O-B / other].

---

## 15. Open clarifications (do not assume)

- P2O-B exact scope boundary (GPS-only vs accidental write merge)
- VP-2 formal sign-off criteria vs audit §16
- Auto-tour port scope on native (full vs subset in P2O-B)
- RLS + realtime channel names for native `user_presence` read (P2O-C)
- P2O-D beta cohort + `presence_source` field semantics
- Notification dedupe when switching writers

---

## 16. Risks summary

| Risk | Mitigation |
|------|------------|
| **Dual-write** (P2O-D) | Single writer, cohort flags, rollback — never casual |
| **Early native “smarter” GPS** | Phase A parity first |
| **Copying WEB-WA forever** | Tag in Truth Audit; Phase B one orchestrator |
| **Skipping Truth Audit** | Blocks P2O-B |
| **Stale parity audit** | Update §21–23 after device QA |
| **Starting P2O-B before VP-2** | Forbidden — GPS on off-brand app |

---

*End of handoff. Paste or @-reference this file at the start of a new chat.*
