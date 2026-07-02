# Native Cutover — Evolution Plan

**Status:** Active roadmap — **Phase 0 signed off** (2026-06-30) · **Part 2 gated** on Apple Developer Program  
**Last updated:** 2026-07-02  
**Authority:** Native is the sole product client; web becomes marketing/info only.

> **Supabase / prod DB:** Security hardening + presence reconcile are **already applied** on production — see [SUPABASE_MIGRATION_OPS.md](./SUPABASE_MIGRATION_OPS.md). Rebuild native after notification/push client changes; do not bulk-run repo migrations on prod.

> **Part 1 vs Part 2:** [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md) — Apple enrollment **and** the **Unified Instant** program (one ripple → all surfaces). iOS push, background location, and coordinated instant UX are Part 2; small pre-prep items (GPS-triggered writes, clock fix) land in Part 1 before enrollment day.

---

## Guiding rules (lock before coding)

| Rule | Meaning |
|------|---------|
| **Native is the product** | All writes, notifications, push, and realtime UX target native only |
| **PWA parity ≠ goal** | Old web timings (12s ping, 45s hub poll, 15s hub clock) are references, not targets. Match PWA only where native is currently worse **and** PWA is the actual ceiling |
| **Semantic certainty ≥ visual certainty** | Faster reads/interpolation OK before faster writes; copy must never lie |
| **Single writer** | One `user_presence` writer per user — native, period (once cutover starts) |
| **Shared package stays** | Constants, FSM, copy ladder live in `@intencity/shared` — web marketing site does not need product parity |

---

## Phase 0 — Trust Foundation ✅ Signed off 2026-06-30

**Goal:** One truth model, one vocabulary, no surface disagreements. No timing changes yet beyond fixing things that cause visible lies.

**Why first:** Faster polls or writes on mismatched rules = faster wrongness.

### Deliverables

**0.1 — Canonical copy ladder (shared package)**  
Single function used by hub, profile, map drawer, venue sheet, live places.

| Tier | Condition | Copy |
|------|-----------|------|
| Ghost | ghost mode | `Hiding location` |
| Online | ≤ online window + valid coords | inner+dwell → `At {venue}` · outer → `Near {venue}` · none → `Active now` |
| Live | ≤ live window, not online | with venue → `Away · At {venue}` · none → `Away` |
| Recent | ≤ recent window | `Recently at {venue}` / `Recently active` |
| Offline | else | `Offline` |

**Surface exceptions (short labels only):** map self chip → `Here` / `Arriving` / `Nearby`.

**0.2 — Single friend-display gate**  
One rule for hub rail, profile pill, map clusters, live places previews:

```
friend visible at venue socially =
  isFriendOnlineNow(coords fresh)
  AND GPS distance in zone
  AND (inner → dwell met | outer → online only)
```

Heat/anonymous counts stay distance-only (no dwell) — but copy never implies dwell from heat alone.

**0.3 — Radius alignment**  
Write and read must use the same venue radii (DB values; unified fallbacks **80/200**, not 35/110 write vs 80/200 read).

**0.4 — Drift register cleanup**  
Close or re-scope TRUTH_DRIFT items that assume web product parity.

### Exit criteria

- [x] Same friend shows same tier/copy on hub, profile, map sheet (given same data)
- [x] No “At a venue” on rail while profile says “Away · At X” for the same snapshot
- [x] Write/read radius fallbacks match

### Phase 0 steps (execution checklist)

| Step | Task | Status |
|------|------|--------|
| 0.1 | Audit current copy paths | ✅ Done |
| 0.2 | Add canonical copy ladder to `@intencity/shared` | ✅ Done — `friendPresenceCopy.ts` |
| 0.3 | Add single friend social gate to `@intencity/shared` | ✅ Done — `friendSocialGate.ts` |
| 0.4 | Wire hub active friends rail | ✅ Done — via `getFriendHubActivitySubtitle` |
| 0.5 | Wire friend profile venue pill | ✅ Done — `useFriendProfileVenuePill` |
| 0.6 | Wire map venue sheet people list | ✅ Done — shared gate in `getVenueSheetPeople` |
| 0.7 | Wire map friend drawer subtitles | ✅ Done — `map.tsx` |
| 0.8 | Wire live places friend previews | ✅ Done — uses `friendQualifiesInsideAtVenue` |
| 0.9 | Align self copy (map chip short labels) | ✅ Done — `myVenuePresence` uses shared ladder for DB fallback |
| 0.10 | Unify venue radius fallbacks (80/200) | ✅ Done — `venueRadii.ts`, `venuesForPresenceSync.ts` |
| 0.11 | Hub UI clock 30s → 10s | ✅ Done — `backgroundReadPolicy.ts` |
| 0.12 | Manual QA on device | ✅ Signed off 2026-06-30 (copy consistent; sync lag expected until Phase 2–3) |
| 0.13 | Update drift register | ✅ Done — D-001, D-003, D-004b/c |

### Key files

`packages/shared/src/presence/`, `apps/mobile/src/lib/presence.ts`, `venuePresenceStats.ts`, `useFriendProfileVenuePill.ts`, `hub.tsx`, `MapVenueSheet.tsx`

### Do NOT

- Match PWA profile pill logic (`venue_id` alone) — native GPS+dwell is strictly better; extend it everywhere instead

---

## Phase 1 — Native Infrastructure Independence ✅ Signed off

**Goal:** Remove all runtime dependency on the PWA product stack before web becomes marketing-only.

**Part 2 deferral:** iOS OS push QA and APNs setup → [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md).

### Phase 1 steps

| Step | Task | Status |
|------|------|--------|
| 1.1 | Push via Supabase Edge Function `push-notify` | ✅ Code · deploy + non-iOS QA |
| 1.2 | Chat SecureStore send queue + foreground/interval flush | ✅ Signed off |
| 1.3 | Typing indicators | ⬜ Deferred |
| 1.4 | Audit web-origin deps | ✅ Feedback → edge `feedback` |
| 1.5 | Boot/reachability | ✅ Phase 0 |

### Exit criteria

- [x] Message send succeeds after airplane mode toggle (queued retry)
- [x] Push **code** off web product routes (edge function + native invoke)
- [ ] Push **delivery** verified on PWA or Android — **QA 2** (iOS → Part 2)
- [x] No critical native path requires deployed Next.js product routes
- [x] Feedback sends via edge `feedback`

---

## Phase 2 — Native Presence Writes ✅ Code complete · device QA below

**Goal:** Native becomes **sole** `user_presence` writer. Required — not optional — because PWA product is going away.

**Principle:** Native GPS already runs at 2–5s. Writes should match acquisition, not old 12s browser pings.

**Cutover:** `packages/shared/src/presence/cutover.ts` — `PRESENCE_WRITE_AUTHORITY = "native"`. Web `AppShell` + `/map` presence upserts disabled. No env flag on mobile.

### Phase 2 steps

| Step | Task | Status |
|------|------|--------|
| 2.1 | Production native writes (all users, foreground) | ✅ |
| 2.2 | Write cadence 3s map / 5s shell | ✅ |
| 2.3 | Full sync path + notifications | ✅ |
| 2.4 | Retire web presence writers | ✅ |
| 2.5 | Ghost mode immediate DB write | ✅ |
| 2.6 | Profile venue earn via sync only | ✅ |
| 2.7 | Shared cutover constant | ✅ |
| 3.x | Native-optimal timing windows (bundled) | ✅ [PRESENCE_WINDOWS_P2O_D.md](./PRESENCE_WINDOWS_P2O_D.md) |

### Deploy edge functions (required once)

```bash
supabase functions deploy push-notify
supabase functions deploy feedback
supabase secrets set RESEND_API_KEY=... FEEDBACK_TO_EMAIL=... FEEDBACK_FROM_EMAIL=...
# Optional push: EXPO_ACCESS_TOKEN, VAPID_* — see supabase/functions/README.md
```

**iOS lock-screen push:** [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md).

---

## Phase 1 — Native Infrastructure Independence (spec)

**Why now:** Push, presence writes, and notifications cannot route through `getintencity.com` API routes once web is info-only.

### Deliverables

**1.1 — Push delivery off web**  
Move `/api/push/notify` logic to **Supabase Edge Function** (or dedicated lightweight service).  
Native `requestPushNotify.ts` calls edge directly — no `EXPO_PUBLIC_WEB_ORIGIN` for push.

**1.2 — Chat send durability**  
Instagram-style mutation queue: optimistic UI + SecureStore-backed retry on failure.  
Survives app kill / network blip.

**1.3 — Typing indicators (optional but high feel)**  
Supabase Realtime broadcast or presence channel per thread — no web involved.

**1.4 — Audit & remove web-origin assumptions**  
Feedback API, deep links, any product fetches to web — list and migrate or drop.

**1.5 — Boot/reachability hardening**  
Ensure no product boot path waits on web.

### Exit criteria

- [ ] Message send succeeds after airplane mode toggle (queued retry) — **QA 1**
- [x] Push **code** off web product routes (edge function + native invoke)
- [ ] Push **delivery** verified on PWA or Android — **QA 2** (iOS → Part 2)
- [x] No critical native path requires deployed Next.js product routes
- [ ] Feedback sends via edge `feedback` — **QA 3**

### Key files

`requestPushNotify.ts`, `sendChatMessage.ts`, web push route (port to edge), `NotificationDeliveryProvider.tsx`

### Target timings (native-optimal, not PWA)

| Path | Target |
|------|--------|
| Push fanout | < 3s p99 to APNs/FCM |
| Failed send retry | exponential, max 30s |
| Typing indicator | < 500ms perceived |

---

## Phase 2 — Native Presence Writes (mandatory cutover)

**Goal:** Native becomes **sole** `user_presence` writer. Required — not optional — because PWA product is going away.

**Principle:** Native GPS already runs at 2–5s. Writes should match acquisition, not old 12s browser pings.

### Deliverables

**2.1 — Enable production native writes**  
Remove “dev flag only” framing. `NativePresenceWriteTracker` runs for all logged-in native users in foreground.

**2.2 — Write cadence (native-optimal)**

| Context | GPS watch | Write throttle |
|---------|-----------|----------------|
| Map focused | 2s / 3m | **3s** |
| Other tabs / shell | 5s / 8m | **5s** (not 12s) |
| Background | no writes initially | — |

**2.3 — Port full sync path**  
`syncUserPresenceWithVenuesFromCoords.ts` — FSM, ghost-safe upsert, venue attach/detach.

**2.4 — Retire web presence writers**  
Delete/disable `AppShell` GPS ping and `/map` write path when native cutover flips — web is marketing only.

**2.5 — Ghost mode write**  
Toggle immediately upserts ghost-safe coords (clear `venue_id`) — no read-only toggle.

**2.6 — Profile venue earn**  
Single path through presence sync (remove duplicate `ProfilePlaceEarnTracker` local-only path).

**2.7 — Cutover switch**  
Feature flag or date flip: `presence_source = native`. Rollback plan documented but web does not write again.

### Exit criteria

- [ ] Friend sees your venue change within **≤5s** on map poll — **QA on device**
- [ ] No web tab open anywhere — presence still updates — **QA on device**
- [ ] Ghost toggle clears venue in DB immediately — **QA on device**
- [x] Zero dual-write (web writers disabled; native always on)

### Key files

`NativePresenceWriteTracker.tsx`, `syncUserPresenceWithVenuesFromCoords.ts`, `presenceWriteFlag.ts`, `apps/web` AppShell (remove writes)

### Do NOT

- Keep 12s shell throttle “because PWA did” — that was a browser battery compromise, not native-optimal

---

## Phase 3 — Native-Optimal Timing & Windows

**Goal:** Rewire all poll clocks, freshness windows, and heat rules for **2–5s native writes** — tighter and more honest than old PWA defaults.

**Principle:** Old windows (4m / 20m / 60m) were tuned for 12s pings. Native at 3–5s gets the P2O-D bundle **with Phase 2**, not later.

### Deliverables

**3.1 — Apply P2O-D constants** (`packages/shared`)

| Constant | Old (PWA-era) | **Native target** |
|----------|---------------|-------------------|
| `FRIEND_ONLINE_BADGE_MS` | 4m | **2m** |
| `MAP_ACTIVITY_WINDOW_MS` | 20m | **12m** (markers, social copy) |
| `HEAT_ACTIVITY_WINDOW_MS` | *(none, used 20m)* | **8m** (heat, glow, checkpoints) |
| `RECENT_WINDOW_MS` | 60m | **30m** |
| `INNER_CONFIRM_MS` | 60s | **90s** |
| `PROFILE_VENUE_DWELL_MS` | 15m | **15m** unchanged |
| `NEARBY_THRESHOLD_M` | 300m | **300m** unchanged |

**3.2 — Add `isPresenceLiveForHeat`**  
Heat/glow/checkpoints use 8m; social copy/markers use 12m; online badge uses 2m.

**3.3 — Read poll rewiring (native-optimal)** — ✅ `backgroundReadPolicy.ts`

| Surface | Old native | **Shipped** | Rationale |
|---------|-----------|-------------|-----------|
| Map presence poll | 3s | **3s** | Matches write cadence |
| Map UI clock | 15s | **10s** | Recompute heat/glow tiers ≤ window/48 |
| Hub presence poll | 45s | **20s** | ≤ 2m badge window ÷ 6 |
| Hub UI clock | 30s → 10s (0.11) | **10s** | Online copy refresh ≤ badge ÷ 12 |
| Background poll | 120s | **60s** | Battery vs stale; realtime still live |
| Resume burst | 800ms debounce | **immediate** | presence + chat list on `active` |
| Live places | 25s | **20s** | Heat rank refresh 4×/min |
| Unread/notifications | 25s | **15s** | Social badge velocity |
| Chat | realtime only | **15s fallback** | Thread + inbox poll |

**3.4 — Presence notifications on native**  
Move `friend_online`, `friend_joined_venue`, `friend_nearby` creation into native sync path (Phase 2 dependency). **iOS OS delivery** of those pushes → Part 2; in-app rows work without it.

**3.5 — Server stale-row hygiene (recommended)**  
TTL or cron to clear `venue_id` on rows older than live window — prevents zombie “at venue” from crashed clients.

### Exit criteria

- [ ] Dead venue loses glow within 8m of last ping
- [ ] Hub rail drops friend within 2m of last coords update
- [ ] Hub clock ticks every 10s — no 30s stale subtitles
- [ ] Presence notifications fire from native transitions only
- [ ] App resume immediately refreshes presence + chat list

### Key files

`packages/shared/src/presence/`, `backgroundReadPolicy.ts`, `foregroundResumeBurst.ts`, `mapPresenceRefresh.ts`, `syncUserPresenceWithVenuesFromCoords.ts`, `venuePresenceStats.ts`

---

## Phase 4 — Location Accuracy & Reliability

**Goal:** Make venue attachment as accurate and trustworthy as the product promise.

**Principle:** Beat Find My / Snap on **venue semantics + honesty**, not on creepy 24/7 dot tracking.

### Deliverables

**4.1 — Confidence layer (L2) before write**  
Suppress writes when:
- accuracy > threshold (consider 50m inner attach)
- teleport speed > 55 m/s
- jitter: fix bounces inner↔outer rapidly → hold previous zone 10–15s

**4.2 — Motion-aware GPS duty cycle (Life360 pattern)**  
When stationary > N minutes inside known inner zone → reduce GPS to low-power; burst on significant motion.

**4.3 — Optional “Always” location (opt-in, Settings)**  
Unlock background presence decay, `friend_nearby` while backgrounded, reliable “Arriving → Here” without foreground.  
Privacy: explicit consent; ghost mode clears background pipeline.  
**Gate:** [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md) (Apple background modes + App Store review).

**4.4 — Geofence assist (iOS/Android native)**  
Register OS geofences at nearby venue outer radii → wake app for burst sync on boundary cross.  
**iOS production geofencing:** Part 2.

**4.5 — Stale `venue_id` server reconciliation**  
If coords show user outside outer radius for > live window → server clears `venue_id` even without client write.

### Exit criteria

- [ ] No heat spike from single bad GPS fix
- [ ] “Arriving → Here” completes without app foreground reset
- [ ] Optional Always mode: friend sees detach within 1 live window of leaving venue

### Key files

`deviceLocationFilters.ts`, `useForegroundLocation.ts`, `computePresenceFromGps.ts`, new motion/geofence modules, Supabase migration for stale cleanup

---

## Phase 5 — Social Velocity (chat, notifications, hub feed)

**Goal:** DM, notifications, and feed feel instant — Instagram/WhatsApp grade where it matters.

### Deliverables

**5.1 — Chat realtime hardening**  
Dedicated Supabase channel per open thread; read receipts UI; online in chat = foreground app (separate from location “Active now”).

**5.2 — Notification inbox**  
Realtime primary; 15s poll fallback only; bundle `friends_active_bundle` (debounce 30s); quiet hours on edge push path.

**5.3 — Hub feed performance**  
Server-side share query (`.eq("is_share").limit(120)`); story ring updates < 1s after post; prefetch next story slide URL.

**5.4 — Discovery search live ranking**  
Venues sorted by live heat + friend activity — not alphabetical. Poll 20s presence slice.

**5.5 — Posting pipeline**  
Capture → preview < 300ms; background upload with optimistic hub row; WYSIWYG publish.

### Exit criteria

- [ ] DM send → recipient toast < 2s when online
- [ ] Own moment ring updates < 1s after post
- [ ] Discovery top venues reflect live heat

---

## Phase 6 — Web Cutover to Marketing-Only

**Goal:** Web stops pretending to be a product client. Native is the only app.

### Deliverables

**6.1 — Web route lockdown**  
`/hub`, `/map`, `/chat`, product auth flows → redirect to App Store / marketing. Overview, privacy, terms, download CTAs only.

**6.2 — Remove all web product writers**  
AppShell GPS / presence sync — **delete**. Map page presence watch — **delete**. Web story composer, hub, chat — **remove or archive**.

**6.3 — Keep on web (minimal)**  
Marketing pages, legal, optional admin tools, edge functions (push, feedback) — not Next.js product page routes.

**6.4 — Env/docs cleanup**  
README, MIGRATION_PHASES, ERA docs updated: “native sole client.” Remove dual-write warnings.

### Exit criteria

- [ ] Logged-in user on web cannot access product surfaces
- [ ] Zero `user_presence` upserts from web in production logs
- [ ] Native app fully functional with web product code removed

**Ops:** [MARKETING_SITE_SETUP.md](./MARKETING_SITE_SETUP.md) — Vercel env, password gate, waitlist, deploy checklist.

---

## Phase 7 — Native Superpowers (post-cutover moat)

**Goal:** Capabilities PWA never could have — long-term differentiation.

| Item | Description |
|------|-------------|
| **MAP-D** | Predictive movement hints, smarter checkpoint ordering |
| **Motion classification** | walking / vehicle / stationary → cadence + copy |
| **Direct MQTT chat gateway** | If Supabase Realtime becomes bottleneck at scale |
| **Split heartbeat schema** | `last_seen_at` vs `venue_attached_at` for cleaner tiers |
| **Outer-ring dwell for heat** | Confidence-gated — only count outer after 30s |
| **Native live activities / widgets** | “Friend arrived at {venue}” on lock screen — **Part 2** |

**Gate:** Phase 2–4 stable + App Store privacy review for each capability. Live Activities require [Part 2](./NATIVE_CUTOVER_PT2.md).

---

## Execution order

```
Part 1 (now — no Apple subscription required for core path)
─────────────────────────────────────────────────────────────
Phase 0  Trust foundation          ✅ signed off 2026-06-30
Phase 1  Infrastructure            ✅ signed off
Phase 2  Native presence writes    ✅ code complete · device QA below
Phase 3  Optimal timing + windows  ✅ constants + read polls (device QA below)
Phase 4  Location accuracy         (foreground first; Always/geofence iOS → Part 2)
Phase 5  Social velocity
Phase 6  Web marketing cutover     ← after Phase 1–2 proven
Phase 7  Superpowers              ← ongoing

Part 2 (Apple Developer Program — see NATIVE_CUTOVER_PT2.md)
─────────────────────────────────────────────────────────────
· Track A: iOS OS push (APNs), TestFlight, App Store
· Track B: Unified Instant — one ripple updates Hub + Map + heat + live places together
· Track C: Always location, geofences, background truth
· Track D: Lock-screen push, Live Activities
· Pre-prep (Part 1): presenceClock fix, GPS-triggered writes, realtime-primary reads
```

Phases **2 + 3** can ship as one release if QA passes — writes and windows are coupled.

---

## Dropped from old plan

| Old assumption | Revised |
|----------------|---------|
| “Match PWA hub 15s clock” | Native target **10s** — PWA 15s was not a ceiling |
| “P2O-D optional / Era 5 later” | **Required** before web retires |
| “Push via web API OK for now” | **Must migrate** in Phase 1 (code ✅; iOS delivery → Part 2) |
| “Web optional Era 4 cutover” | **Phase 6 mandatory** — marketing only |
| “Dual-write cohort testing” | Brief beta only; production = native sole writer |
| “Keep 12s shell write throttle” | **5s** native shell |

---

## Related docs

- [MARKETING_SITE_SETUP.md](./MARKETING_SITE_SETUP.md) — **Vercel deploy, password gate, Supabase waitlist**
- [SUPABASE_MIGRATION_OPS.md](./SUPABASE_MIGRATION_OPS.md) — **prod migration apply status** (what’s live, what not to re-run)
- [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md) — Apple gate + **Unified Instant** plan (one ripple, all surfaces)
- [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md)
- [PRESENCE_WINDOWS_P2O_D.md](./PRESENCE_WINDOWS_P2O_D.md)
- [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)
- [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md)
- [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)
