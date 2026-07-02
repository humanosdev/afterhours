# System Truth Audit — Intencity social geography

**Purpose:** Canonical documentation of **production PWA semantics** for location, presence, map, heat, checkpoints, ghost, polling, and visibility — before **P2O-B** ports behavior. Native must **mirror this document** in Phase A; do not reinterpret.

**Status:** Initial audit **2026-05-17** (code-mined from `apps/web`, `packages/shared`).  
**Authority:** **SECONDARY** (presence/map chapters) — **PRIMARY** behavioral truth is [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md). **PRIMARY** doctrine: [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md), [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md).  
**Native sequencing:** [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) (trust-first — supersedes informal “add GPS / alive map” framing).  
**Governance:** [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) · drift: [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md).

**Rule:** If PWA logic is messy, document it **exactly**. Refinement happens **after** semantic parity, not during reinterpretation. GPS is fuel; **inside/nearby/live/recent/online/ghost** are the product ([PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md)).

**Related:** [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md), [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [MIGRATION_PHASES.md](./MIGRATION_PHASES.md), [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md), [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md), [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md).

---

## Classification legend

| Tag | Meaning |
|-----|---------|
| **CANON** | Sacred product truth — native must match until product changes shared constants or PWA. |
| **HEUR** | Tuned threshold/interval — freeze during migration; tag any change. |
| **WEB-WA** | Browser-specific workaround that still defines **current** UX until unified engine. |
| **TEMP** | Known compromise / partial implementation. |
| **UNK** | Not verified in this pass — block native port until resolved. |

---

## Global constants registry

Source: `packages/shared/src/presence/constants.ts` (re-exported `apps/web/src/lib/presence.ts`).

| Constant | Value | Classification | Used for |
|----------|-------|----------------|----------|
| `FRIEND_ONLINE_BADGE_MS` | **4 min** | **CANON** | “Online now”, hub active-friends pulse, profile **Online** label (`isFriendOnlineNow`) |
| `MAP_ACTIVITY_WINDOW_MS` | **20 min** | **CANON** | Venue heat participation, `isPresenceLive`, map “live” tier, friend **Away · At {venue}** |
| `RECENT_WINDOW_MS` | **60 min** | **CANON** | “Recent” tier (`isPresenceRecent`), “Recently at {venue}” |
| `INNER_CONFIRM_MS` | **60 s** | **CANON** | `inner_pending` → `inner_confirmed` in zone state machine |
| `NEARBY_THRESHOLD_M` | **300 m** | **HEUR** | Friend-nearby notifications (web `userPresenceVenueSync` — verify call sites) |
| `MAP_FALLBACK_CENTER_LAT/LNG` | 39.9526, -75.1636 | **CANON** | Default map center; `isLikelyMapFallbackPresence` filters stacked junk coords |

**Critical split (CANON):** **Online badge (4m) ≠ map live (20m) ≠ recent (60m).** Different UI strings depend on different functions — never collapse in native.

---

## Cross-surface timing matrix

| Surface | Mechanism | Interval / trigger | PWA source | Classification |
|---------|-----------|-------------------|------------|----------------|
| Map `user_presence` load | `setInterval` when tab visible | **3 s** | `map/page.tsx` ~L2718 | **HEUR** |
| Map UI freshness tick | `setPresenceUiTick` | **15 s** | `map/page.tsx` ~L1329 | **HEUR** |
| AppShell GPS (non-map) | `getCurrentPosition` | **12 s** | `AppShell.tsx` ~L426 | **HEUR** |
| AppShell skips `/map` | pathname guard | — | `AppShell.tsx` ~L330 | **CANON** (no double-write) |
| Hub presence poll | `setInterval` | **45 s** | `hub/page.tsx` ~L361 | **HEUR** |
| Hub UI clock | `setPresenceClock` | **15 s** | `hub/page.tsx` ~L281 | **HEUR** |
| Live places poll | `setInterval` | **25 s** | `live-places/page.tsx` ~L147 | **HEUR** |
| Hub + live places realtime | `subscribeUserPresenceChanges` | postgres_changes | `userPresenceRealtime.ts` | **CANON** (hybrid with poll) |
| Map GPS display | `watchPosition` | continuous (maxAge 5s) | `map/page.tsx` ~L1091 | **WEB-WA** |
| Map presence write | `syncUserPresenceWithVenuesFromCoords` | on GPS sync path (map) | `userPresenceVenueSync.ts` | **CANON** |
| Auto-tour idle grace | — | **20 s** | `AUTO_TOUR_IDLE_GRACE_MS` | **HEUR** |
| Auto-tour repeat | — | **4 s** | `AUTO_TOUR_REPEAT_MS` | **HEUR** |
| Auto-tour pause after interaction | — | **2.2 s** | `AUTO_TOUR_PAUSE_MS` | **HEUR** |

---

## Chapter 1 — Location acquisition

### 1. Purpose
Acquire device coordinates for map UX (puck, distance, locate) and for **`user_presence` writes** (web only today).

### 2. PWA source files
- `apps/web/src/app/map/page.tsx` — `watchPosition`, `getCurrentPosition` on resume, **no fake coords on deny**
- `apps/web/src/components/AppShell.tsx` — `getCurrentPosition` every **12s**, **skipped on `/map`**
- `apps/web/src/lib/userPresenceWrite.ts` — `SHELL_GEOLOCATION_OPTIONS` (`enableHighAccuracy`, `maximumAge: 8000`, `timeout: 22000`)

### 3. Constants / options
- Map watch: `{ enableHighAccuracy: true, maximumAge: 5000 }` — **WEB-WA**
- Shell ping: `SHELL_GEOLOCATION_OPTIONS` — **HEUR**

### 4. Fallback behavior (CANON)
- GPS denied/unavailable: **keep last real fix**; do **not** invent user location (`map/page.tsx` ~L1098 comment).
- No venues loaded: map friend markers cleared to avoid fake clustering at fallback center (~L2770).

### 5. Native today
- **No** `expo-location`. Map **Locate** refits camera to **catalog venue bounds** (`VenuesMapCanvas` `cameraRefitToken`) — **not** PWA `runLocateCycle`.
- **Drift:** HIGH — locate semantics differ until **P2O-B**.

### 6. Native migration (P2O-B)
- Port `watchPosition` + `runLocateCycle` priority stack **exactly** (sheet venue → checked-in venue → you → presence → fresh GPS read).
- Two-tap cycle: zoom ~15.5 then zoom ~1.65 earth view — **CANON** from `runLocateCycle` ~L1369.

### 7. Classification summary
| Rule | Tag |
|------|-----|
| No fake GPS | **CANON** |
| Map vs shell split | **CANON** |
| Intervals | **HEUR** |

---

## Chapter 2 — Presence write path

### 1. Purpose
Upsert `user_presence` with venue zone, state machine, notifications on transitions.

### 2. PWA source files
- `apps/web/src/lib/userPresenceVenueSync.ts` — `syncUserPresenceWithVenuesFromCoords`
- `apps/web/src/lib/userPresenceWrite.ts` — `upsertUserPresenceGhostSafeCoords`, `upsertUserPresenceLatLng`
- `packages/shared/src/venue/computePresenceFromGps.ts` — zone selection (pure)

### 3. Write ownership (CANON)
- **Exactly one client writer per session** — today **web only** ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)).
- Mobile: **no reads, no writes** until **P2O-C** / **P2O-D**.

### 4. Zone math (CANON)
`computePresenceFromGps`:
1. For each venue: distance to lat/lng.
2. Best **inner** (≤ `inner_radius_m`), else **outer**, else **halo** (`haloLimitM`).
3. State: entering inner → `inner_pending` + `enteredInnerAt`; after `INNER_CONFIRM_MS` → `inner_confirmed`; leaving inner → `outside`.

### 5. Ghost write shape (CANON)
`upsertUserPresenceGhostSafeCoords`: keeps lat/lng; sets `venue_id`, `zone_type`, `entered_inner_at` **null**; `venue_state: "outside"`.

### 6. Notifications
Written from `userPresenceVenueSync` via `createNotification` — friend nearby / venue transitions — **CANON** web side effect; **dual-writer risk** if native writes without retiring web ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)).

### 7. Native migration
| Slice | Scope |
|-------|--------|
| **P2O-B** | GPS only — **default: still no writes** unless explicitly merged |
| **P2O-D** | Port full `syncUserPresenceWithVenuesFromCoords` + ghost + single-writer cohort |

---

## Chapter 3 — Online / live / recent (display semantics)

### 1. Purpose
Consistent social copy: who is “online”, “away”, “recent”, “offline”, and venue headlines.

### 2. PWA source files
- `packages/shared/src/presence/freshness.ts`
- `apps/web/src/lib/presence.ts` — `getFriendSocialActivitySubtitle`, `getFriendProfileVenueHeadline`, `getFriendProfileStatusLabel`

### 3. Logic (CANON)

| Function | Window | User-facing examples |
|----------|--------|----------------------|
| `isFriendOnlineNow` | 4 min | “Online”, “At {venue}”, “Active now” |
| `isPresenceLive` | 20 min | “Away”, “Away · At {venue}” |
| `isPresenceRecent` | 60 min | “Recently active”, “Recently at {venue}” |
| else | stale | “Offline”, “Not at a venue” |
| `ghost_mode` | — | “Hiding location” (overrides) |

### 4. Native today
- Hub active friends: static empty + honest copy — **OK**.
- Map friends panel: was **“Nearby”** for all — **misleading** (fix in VP-2 honesty pass).
- Profile venue pill: static “Not at a venue” — honest until **P2O-C**.

### 5. Native migration (**P2O-C**)
- Import shared freshness + web copy helpers verbatim; pass `updated_at`, `venue_id`, `venue_name`, `ghost_mode` from `user_presence` + `profiles`.

---

## Chapter 4 — Heat & venue energy

### 1. Purpose
Visualize venue activity density on map (heatmap + glow) and checkpoint/sheet affordances.

### 2. PWA source files
- `apps/web/src/app/map/page.tsx` — `VENUE_HEAT_LAYER`, `VENUE_GLOW_LAYER`, `getCountsForVenue`, `venueHeatHexFromActivity` (shared)
- `apps/web/src/lib/districtFlowTrails.ts` — district flow (**G** defer)

### 3. Activity count (CANON)
`getCountsForVenue(venueId, presence, friendsById, venues, meId)`:
- Skip: `hiddenIds`, self, invalid coords, **not** `isPresenceLive` (20m).
- Visibility: non-friends only counted if within `outer_radius_m` of venue.
- **redTotal**: inside `inner_radius_m`; **greenTotal**: inside `outer` but not inner.
- **activity** for checkpoint = `redTotal + greenTotal` (friends + non-friends per rules).

### 4. Heatmap
- Mapbox heatmap layer driven by presence aggregation — weights/intensity expressions in `map/page.tsx` ~L1837+ — **HEUR** visual tuning.

### 5. Native today
- **No** heatmap/glow layers.
- Checkpoint bar: static accent glow, **no** activity-based pulse tier — honest deferral.

### 6. Native migration (**P2O-C**)
- Port `getCountsForVenue` logic before heat visuals.
- Heatmap/glow: port layer config or RN equivalent — **do not** simplify participation rules.

---

## Chapter 5 — Checkpoint bar & auto-tour

### 1. Purpose
Swipe/hop between “hot” venues; auto-cycle when user idle.

### 2. PWA source files
- `apps/web/src/app/map/page.tsx` — `checkpoints` useMemo ~L1560, auto-tour ~L1743+, portal positioning

### 3. Ordering (CANON)
```
checkpoints = filteredVenues
  .map(activity, distanceFromYou)
  .sort((a,b) => b.activity - a.activity || a.distanceFromYou - b.distanceFromYou)
```
- `distanceFromYou`: from `you` GPS, else self presence row, else `selfPresenceCoordsRef` — else `MAX_SAFE_INTEGER`.

### 4. Auto-tour (HEUR)
- Requires `autoVenueTourEnabled` (settings).
- Idle ≥ `AUTO_TOUR_IDLE_GRACE_MS` (20s).
- Repeat ≥ `AUTO_TOUR_REPEAT_MS` (4s).
- Paused until `AUTO_TOUR_PAUSE_MS` after user interaction / locate / arrows.

### 5. UI position (CANON)
- Checkpoint bar anchored **safe-area + 124px** above bottom (web); native uses `mapCheckpointBarBottom(insets)` — verify on device.

### 6. Native today
- Checkpoints = **filtered geo venues in catalog order** (category filter only) — **SEMANTIC DRIFT** vs PWA sort.
- Prev/next manual only; no auto-tour; no distance subtitle.
- **VP-2:** Do not fake sort — label honestly or hide swiper until **P2O-C**.

### 7. Native migration
| Slice | Work |
|-------|------|
| **P2O-C** | Port checkpoint sort + activity display |
| **P2O-B** | Distance line on checkpoint (`formatMilesFromMeters`) |
| **P2O-C+** | Auto-tour timers |

---

## Chapter 6 — Realtime & polling

### 1. Purpose
Keep presence UI fresh without excessive load.

### 2. PWA pattern (CANON hybrid)
- **Map:** 3s poll when visible; no realtime channel on map page (poll-only in audited section).
- **Hub / live-places:** realtime `user_presence` **plus** backup poll (45s / 25s).

### 3. Source
- `apps/web/src/lib/userPresenceRealtime.ts` — `subscribeUserPresenceChanges`
- Channel names: `hub-user-presence`, `live-places-user-presence` — **HEUR** (must match in native **P2O-C** RLS review)

### 4. Native today
- **No** realtime; **no** `user_presence` reads.

### 5. Native migration (**P2O-C**)
- Port channel names + merge strategy (realtime patch + poll reconcile) per surface.

---

## Chapter 7 — Visibility & foreground

### 1. Purpose
Who appears on map / counts / friend lists.

### 2. Rules (CANON) — `map/page.tsx`
- **Ghost:** friends with `ghost_mode` hidden from others’ map markers; self uses `myGhostMode`.
- **Hidden users:** `hiddenIds` set — excluded from counts.
- **Non-friend presence:** only if within venue `outer_radius_m` for count purposes (`getCountsForVenue`).
- **Stale presence:** `getPresenceFreshness === "stale"` excluded from latest/active maps (~L2792).

### 3. Native today
- Friends list on map = accepted friends roster only — **no** presence filtering (OK without reads).

---

## Chapter 8 — Stale & fallback coordinates

### 1. Purpose
Avoid showing junk pins at Philly fallback center.

### 2. Source
- `packages/shared/src/presence/coordinates.ts` — `isValidCoordinatePair`, `isLikelyMapFallbackPresence`

### 3. Native migration
- Use shared helpers when **`user_presence`** reads ship — **CANON**.

---

## Chapter 9 — Venue zones & classification

### 1. Purpose
Map category filters and pin colors.

### 2. PWA source
- `apps/web/src/lib/venueCategoryAccent.ts` (ported to `apps/mobile/src/lib/venueCategoryAccent.ts`)
- `map/page.tsx` `filteredVenues` ~L859 — nightlife excludes campus name fragments

### 3. Classification
- Category matchers: **CANON** (ported).
- Campus name substring list: **CANON** (`CAMPUS_VENUE_NAME_SUBSTRINGS`).

### 4. Native today
- Filter logic **ported**; pin art differs (Lucide vs canvas) — **visual only**.

---

## Chapter 10 — Ghost mode

### 1. Purpose
User hides venue from friends while optionally keeping coords for self/system.

### 2. PWA behavior (CANON)
- Toggle on map: `profiles.ghost_mode` update + immediate `myGhostMode` state (`map/page.tsx` ~L3301).
- Writes: `upsertUserPresenceGhostSafeCoords` on next sync.
- Friends see **“Hiding location”**; excluded from map markers and trending friend counts.

### 3. Native today
- **Local toggle only** — **CRITICAL DRIFT** (fixed in VP-2: read-only display from `profiles.ghost_mode`, toggle disabled until **P2O-D**).

### 4. Native migration
| Slice | Work |
|-------|------|
| **P2O-C** | Read `ghost_mode` for display |
| **P2O-D** | Persist toggle + ghost-safe upsert on write path |

---

## Chapter 11 — Map overlay relationships

### 1. Canonical graph (CANON)

```
Category chips → filteredVenues (catalog + category rules)
       ↓
Map pins / labels → filteredVenues with lat/lng
       ↓
Heat/glow layers → presence aggregation on filteredVenues (PWA only)
       ↓
Checkpoint swiper → sorted by activity → distance (PWA only)
       ↓
Selected venue → venue sheet (inside/nearby people, density)
       ↓
Locate → runLocateCycle (sheet > check-in > GPS)
```

### 2. Native today (honest subset)

```
Category chips → filteredVenues ✅
       ↓
Pins → geo filtered venues ✅
       ↓
(no heat/glow)
       ↓
Checkpoint → catalog order ⚠️ (not PWA sort)
       ↓
Sheet → venue catalog + honest placeholders ✅
       ↓
Locate → camera refit catalog ⚠️ (not GPS cycle)
```

---

## Native porting map (summary)

| System | P2O slice | Native must |
|--------|-----------|-------------|
| GPS / locate / distance | **P2O-B** | Port `watchPosition` + `runLocateCycle`; no write unless approved |
| `user_presence` read | **P2O-C** | Reads + all display semantics in Ch. 3–5, 7, 10 |
| `user_presence` write | **P2O-D** | `syncUserPresenceWithVenuesFromCoords`; single writer |
| Heatmap/glow | **P2O-C** | After `getCountsForVenue` parity |
| Realtime | **P2O-C** | `subscribeUserPresenceChanges` per surface |
| Ghost toggle write | **P2O-D** | With presence writer |
| Category filters | **Done** | Keep synced with web file |
| Checkpoint sort | **P2O-C** | Not before presence reads |
| Trending search | **P2O-C** | Port `trendingRanked` useMemo from `search/page.tsx` |
| Chat/notifications realtime | **Phase 3+** | Separate from presence |

---

## Semantic drift register (active)

| # | Drift | Severity | VP-2 action | P2O fix |
|---|-------|----------|-------------|---------|
| 1 | Map friends subtitle “Nearby” | **High** | Neutral copy | P2O-C subtitles |
| 2 | Ghost toggle local-only | **High** | Read-only from profile | P2O-D write |
| 3 | Checkpoint catalog order | **High** | Honest UX / no fake sort | P2O-C sort |
| 4 | Locate = bounds refit | **High** | Label “Preview” | P2O-B cycle |
| 5 | Trending = alphabetical | **Med** | Rename section | P2O-C `trendingRanked` |
| 6 | Live places “0 live” | **Med** | Remove fake count | P2O-C |
| 7 | Hub venue chip “ACTIVITY 0” | **Med** | Honest pill | P2O-C |
| 8 | Notification prefs local | **Med** | Document | Phase F |
| 9 | Signup without legal API | **Med** | Document / port | Product |

---

## Auth flows (VP-2 parity — 2026-05-17)

| Flow | PWA source | Native | Notes |
|------|------------|--------|-------|
| Login | `login/page.tsx` | ✅ | `onboarding_complete` → `/onboarding` else `/hub`; `reactivate_my_account_after_login` RPC |
| Signup | `signup/page.tsx` | ✅ | Temple email; session → `/onboarding`; else verify email copy |
| Forgot password | `forgot-password/page.tsx` | ✅ | `resetPasswordForEmail` + `intencity://reset-password` redirect |
| Reset password | `reset-password/page.tsx` | ✅ | Deep link tokens + `PASSWORD_RECOVERY`; **add redirect URL in Supabase Auth allow list** |
| Onboarding | `onboarding/page.tsx` | ✅ | Sets `onboarding_complete`; native skips web push/PWA install |
| Username | `onboarding/username/page.tsx` | ✅ | `normalizeUsername`, ilike availability, upsert → `/profile` |
| Legal consent API | `signup` + `login` | **Deferred** | U5 — web `POST /api/legal/consent` |
| Auth error semantics | message substrings (PWA) | ✅ code-first | See [AUTH_FAILURE_AUDIT.md](./AUTH_FAILURE_AUDIT.md) — signup `over_email_send_rate_limit` was mislabeled “too many attempts” |

---

## Map shell (atmospheric — 2026-05-17)

| Item | PWA | Native | Notes |
|------|-----|--------|-------|
| Layout / chrome | `map/page.tsx` | ✅ aligned | [MAP_SHELL_DRIFT_AUDIT.md](./MAP_SHELL_DRIFT_AUDIT.md) |
| Live geography | presence + GPS | **Deferred** | P2O-B / P2O-C — no fake heat/dots |

---

## Friends & discovery search (READ-SOCIAL-2 — 2026-05-17)

| Flow | PWA source | Native | Notes |
|------|------------|--------|-------|
| Friends local search | `profile/friends/page.tsx` | ✅ | No debounce; mutual/other when `?view=` |
| Global discovery | `search/page.tsx` | ✅ partial | FoF + pills + friends-first search; trending/live deferred |
| Active friends / request actions | friends page | **Deferred** | No `user_presence`; writes later |

See [FRIENDS_SEARCH_PARITY_AUDIT.md](./FRIENDS_SEARCH_PARITY_AUDIT.md).

---

## Chat thread (READ-SOCIAL-1 — 2026-05-17)

| Flow | PWA source | Native | Notes |
|------|------------|--------|-------|
| Thread history | `chat/[id]/page.tsx` | ✅ read-only | `fetchChatThread.ts` — no realtime/send/seen |
| Thread layout | bubbles + header | ✅ | [CHAT_THREAD_PARITY_AUDIT.md](./CHAT_THREAD_PARITY_AUDIT.md) |
| Send / realtime | full | **Deferred** | REALTIME-1 |

---

## Stories & moments (social UI — CANON, 2026-05-17)

**PWA sources:** `apps/web/src/app/hub/page.tsx`, `ProfileStoriesGrid.tsx`, `lib/momentWindow.ts`, `lib/storyViews.ts`.

### Hub moments rail

| Rule | Semantics | Classification |
|------|-----------|----------------|
| Row inclusion | Only users with **≥1 active** non-share story (`is_share: false`) with `media_url` and `isMomentStillActive` | **CANON** |
| Exclusion | Friends **without** active moments **do not** appear in rail | **CANON** |
| Own slot | Always shown (“Your moment”); tap → viewer if active else composer | **CANON** |
| Ring “active” | Unseen active story (`story_views` / `fetchViewedStoryIds`) | **CANON** |
| Shares in rail | **Never** — shares live in Shares feed only | **CANON** |

**Native:** `fetchActiveMomentsByUserIds` + `friendMomentGroups` filter (2026-05-17). Hub `postgres_changes` refresh = **deferred** (PWA has realtime bump; not required for honest read).

### Moment expiry

| Rule | Semantics | Classification |
|------|-----------|----------------|
| Window | `min(expires_at, created_at + 24h)` vs now | **CANON** — `momentWindow.ts` / `isMomentStillActive` |

### Profile archive (owner)

| Rule | Semantics | Classification |
|------|-----------|----------------|
| Archive grid | Expired non-share moments **OR** hidden shares (`share_hidden`) | **CANON** |
| Hidden shares mgmt | `/archive/hidden` route (restore/delete) | **CANON** |
| Detail | `/moments/[id]?view=archive` — owner-only gate on web | **CANON** |

**Native:** `fetchProfileArchive.ts` mirrors `ProfileStoriesGrid` mode `archive`.

### Story ring — three visual states

| State | Condition | UI | Classification |
|-------|-----------|-----|----------------|
| **None** | No active (non-share, in-window) story | Plain avatar — **no ring** | **CANON** |
| **Seen** | Active story exists; all in `story_views` for viewer | Muted/grey ring | **CANON** |
| **Unseen** | Active story exists; ≥1 not in `story_views` | Glow ring | **CANON** — per-story, OR per user |

| Rule | Semantics | Classification |
|------|-----------|----------------|
| Hub friend cell | Only if active story exists | **CANON** |
| Hub own `+` badge | Only when **no** active story (`none`) | **CANON** |
| Record view | `recordStoryView` in viewer (`!is_share`) | **CANON** |
| Expiry | Fails active filter → `none`; leaves hub rail | **CANON** |

**Native:** `StoryRing` `ringState === "none"` → `ProfileAvatar` only — [VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md).

### Distinct surfaces (do not conflate)

| Surface | Route / component | Purpose |
|---------|-------------------|---------|
| Story viewer | `StoryViewerModal` | Fullscreen **active moments** per user |
| Post detail | `/moments/[id]` | Share or archived **post** (likes/comments when share) |

See [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md).

---

## Media / Moments / Shares (native migration truth — 2026-05-18)

**Canonical docs:** [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) · [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) (operational)

| Plane | Native status | VP-2 signoff |
|-------|---------------|--------------|
| **Viewing** (rail, viewer, feed, detail, archive, rings, `story_views`) | Mostly migrated | In scope |
| **Creation** (camera, crop, filters, library) | **MEDIA-0.2A** live camera + PWA chrome; filter bake + post-shutter crop **MEDIA-1** | **In scope** for VP-2 atmosphere |
| **Camera unavailable + live feed** | PWA `streamReady`; native `StoryCameraSurface` | **Canonical** — mutually exclusive |
| **Post/hide/delete refresh** | `story-posted` listeners | `bumpStoryEpoch` — MEDIA-0.2C | **In scope** VP-2 |
| **Share interactions** (like, comment, hide, delete on existing rows) | Implemented | In scope |
| **Library picker crash** | **MEDIA-0.1** — plist + plugin + try/catch | **Verify on device** after rebuild |

**Gate drift:** [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) strict VP-2 text says “no camera / no writes”; code includes `uploadStoryMedia` + `story_likes` / `story_comments`. Use **MEDIA_SYSTEM_STATUS** as authority until gate text is reconciled.

---

## Open questions / UNK

| ID | Question | Blocker |
|----|----------|---------|
| U1 | `NEARBY_THRESHOLD_M` (300m) — exact notification trigger path vs literal in sync | P2O-D notifications |
| U2 | Map page: any realtime in addition to 3s poll? (audited section poll-only) | P2O-C |
| U3 | `presence_source` field for native beta cohort | P2O-D |
| U4 | Native day/night map styles — parity required? | VP-2 product |
| U5 | Legal consent API required for App Store signup? | VP-2 auth |
| U6 | VP-2 includes bounded share writes + library post, or gate text “no writes” is strict? | VP-2 / MEDIA-1 gate |
| U7 | iOS photo library crash — plist-only vs deeper RN issue? | MEDIA-0.1 |

---

## P2O-B signoff blockers (checklist)

- [ ] **VP-2** signed off in `MIGRATION_PHASES.md` (device QA)
- [ ] This document reviewed; **no UNK** on items in P2O-B scope (or waived)
- [ ] Misleading semantics cleanup merged (Priority 2)
- [ ] P2O-B plan: GPS + locate + distance only; **no `user_presence` write** unless explicit merge
- [ ] Dual-write rollback plan for any P2O-D work ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))

---

## Phase B / C notes (future shared engine)

After parity stabilizes:
- Move `getCountsForVenue`, checkpoint sort, trending rank, and subtitle ladder into `@intencity/shared` orchestrators.
- Web + native consume same functions with platform I/O adapters (GPS, Supabase).
- **Do not** change windows/thresholds during Phase B without product approval ([SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md)).

---

*End of initial System Truth Audit. Update this file when PWA behavior changes or UNK rows are resolved.*
