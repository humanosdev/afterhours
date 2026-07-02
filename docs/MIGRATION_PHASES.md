# Migration phases (monorepo → native)

**Purpose:** Single source of truth for **engineering migration** phases (monorepo, shared engine, native app). This is **not** the same as product phases in [V1_LAUNCH_PLAN.md](./V1_LAUNCH_PLAN.md) (moderation, admin, launch checklist).

**Governance:** [DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md) · **Drift:** [TRUTH_DRIFT_REGISTER.md](./TRUTH_DRIFT_REGISTER.md)

> **Supabase prod ops (2026-07-02):** Native security hardening + Phase 4.5 presence reconcile are **already applied** on production. **Do not bulk-run** `supabase/migrations/` on prod. Details: [SUPABASE_MIGRATION_OPS.md](./SUPABASE_MIGRATION_OPS.md). Native app must be **rebuilt** for `create_notification_v1` + push `notificationId` changes.

---

## Presence trust & believable social geography (architecture lock)

**This project is now:** presence trust + believable social geography — not “migration with a map skin.”

| Doc | Role |
|-----|------|
| [TRUTH_LAYER_DOCTRINE.md](./TRUTH_LAYER_DOCTRINE.md) | L0–L5 truth hierarchy + decision filter |
| [PRESENCE_TRUST_ARCHITECTURE.md](./PRESENCE_TRUST_ARCHITECTURE.md) | What PWA is/is not, confidence model, visual honesty |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | **PRIMARY** — what PWA actually does today |
| [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md) | **PRIMARY** — trust-first native sequencing |
| [NATIVE_CUTOVER.md](./NATIVE_CUTOVER.md) | **PRIMARY** — native product cutover Phases 0–7 (Part 1) |
| [NATIVE_CUTOVER_PT2.md](./NATIVE_CUTOVER_PT2.md) | Apple Developer Program gate — iOS push, store, background iOS |

**Core realization:** Native precision = five layers (acquisition, movement, confidence, visual interpolation, battery). PWA today ≈ layer 1 + partial layer 3. GPS is fuel; **inside/nearby/live/recent/online/ghost** are the product.

**Semantic safety:** No major map/presence work unless PRIMARY docs align and [TRUTH_DRIFT_REGISTER](./TRUTH_DRIFT_REGISTER.md) High items are addressed or waived.

### Production era model (binding)

**[PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md)** — five eras; do not skip:

| Era | Summary |
|-----|---------|
| **1 — Mirror** | ✅ **Signed off 2026-05-18** — read/display parity on critical paths. |
| **2 — Notifications** | ✅ **NOTIF-3 → NOTIF-2 → NOTIF-4**; web stays sole `user_presence` writer. |
| **3 — Evolve** *(now)* | Native precision — GPS filters, local puck, live map refresh; [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md). |
| **4 — Web cutover** *(optional)* | Marketing-only web — can defer while testing on PWA. |
| **5 — Presence authority** | **`P2O-D` last** — native sole writer; [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md). |

**`P2O-D` is Era 5, not next.** Evolve improves display; presence writes stay **final** gated slice.

### Post–2O phases (trust-first names)

| Phase | Old shorthand | Trust-first objective | Era | Blocked until gate |
|-------|---------------|----------------------|-----|-------------------|
| **P2O-B** | Add GPS | Trustworthy location acquisition | **1** | VP-2 sign-off |
| **P2O-C** | Read presence | Semantic validation parity | **1** | P2O-B (recommended) |
| **MAP-B** | Live markers | Confidence visualization (friends) | **1** | P2O-C |
| **MAP-C** | Alive map | Confidence visualization (venue energy) | **1** | P2O-C + honesty review |
| **REALTIME-*** | Live UI | Poll/subscription parity (display) | **1** | Per surface |
| **P2O-D** | Turn on writes | Presence authority migration | **5 (final)** | Era 3 Evolve stable + [P2O_D_PLACEHOLDER](./P2O_D_PLACEHOLDER.md) |
| **NOTIF-3** | Delivery UX | Hub badge, message toast, chat tab badge | **2** | Era 1 sign-off |
| **NOTIF-2** | Native notify creates | Likes, comments, FR accepted from native | **2** | ✅ Shipped — [NOTIF_2_SLICE.md](./NOTIF_2_SLICE.md) |
| **NOTIF-4** | Device push | Expo APNs/FCM | **2** | Code ✅ · **iOS OS push → [NATIVE_CUTOVER_PT2](./NATIVE_CUTOVER_PT2.md)** · [NOTIF_4_SLICE.md](./NOTIF_4_SLICE.md) |

**Do not ship** heat, live pulsing markers, or animated city energy before confidence architecture — trust collapse risk ([PRESENCE_TRUST_ARCHITECTURE.md §7](./PRESENCE_TRUST_ARCHITECTURE.md)).

Technical map layers: [NATIVE_MAP_EVOLUTION.md](./NATIVE_MAP_EVOLUTION.md) (SECONDARY to [NATIVE_PRESENCE_EVOLUTION.md](./NATIVE_PRESENCE_EVOLUTION.md)).

### Implementation hard rule (all phases)

**[IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md)** — binding for VP-2, P2O-*, MAP-*, and future work:

1. Audit PWA first · 2. Classify change · 3. Execution ≠ meaning · 4. “Better” = trustworthy · 5. Understand web limits · 6. Believable social geography? · 7. **Current priority: VP-2 / Core Feel Lock**

Active checklist: [VP2_APP_WIDE_AUDIT.md](./VP2_APP_WIDE_AUDIT.md).

---

## Native Product Equivalence Doctrine

**Binding standard:** **`apps/mobile` must eventually be a full native Intencity app that can do every single thing the production PWA can do** — every page, subpage, modal, sheet, swipe-up, overlay, action, setting, message flow, profile action, story/moment/share flow, map interaction, notification flow, auth/onboarding flow, and legal/settings surface — **but faster, smoother, and more native** where native improves the experience.

**`apps/web` (PWA) remains the current source of truth for:**

| Domain | Native must inherit |
|--------|---------------------|
| **Visual identity** | Brand, color, type, glass, logos, density, hierarchy |
| **Product hierarchy** | Tabs, stacks, entry points, secondary routes |
| **Route / surface inventory** | Every URL **and** every in-page overlay (sheets, drawers, modals) |
| **Behavior / logic** | State machines, empty/error/loading, gating, copy |
| **Map / social / presence semantics** | What “live”, “nearby”, and venue energy **mean** — until native is authorized to write presence |

**Native must mirror that source of truth in user-facing result.** Implementation may differ (React Native vs Next.js, native Mapbox vs web GL, SecureStore vs cookies) **only** to achieve **equal or better** UX. The visible product **must not** look worse, unrelated, or like a restarted design.

**Definitions (strict):**

| Term | Meaning |
|------|---------|
| **Parity** | **Exact user-facing equivalence** with PWA for that surface — same affordances, states, and brand — **not** rough similarity or “inspired by.” |
| **Native upgrade** | **Smoother / faster / more reliable** execution of the **same** product — **not** a redesign, rebrand, or alternate IA. |
| **Scaffold** | Route or shell exists; **user cannot yet do what PWA does** — **not** parity. |
| **Done** | Native user can **do the same thing** as on PWA, with the **same visual identity**, with **no missing critical states** (loading, empty, error, permission-denied, etc.). |

**Seven binding rules:**

1. Native must eventually support **every PWA capability** (including secondary and “power user” surfaces).
2. Native must look **visually identical or better** while preserving the **exact same brand system**.
3. Native must feel **faster, smoother, and more reliable** than PWA where platform APIs allow — without changing product meaning.
4. Native must **not** introduce a separate design language, palette, or navigation metaphor.
5. Native must **not** leave any PWA page or action behind because it is secondary.
6. Native may use different code/components **only** to achieve equal-or-better UX with the same identity and behavior.
7. **PWA is the blueprint; native becomes the better production implementation** — not a parallel product.

**Per-surface status ladder** (track **every** route, subroute, modal, drawer, bottom sheet, swipe-up, overlay, and critical in-page state):

| Stage | Meaning |
|-------|---------|
| **Missing** | No native surface; user cannot reach equivalent UX. |
| **Scaffolded** | Route/shell exists (e.g. `ParityPlaceholderScreen`, ribbon, or stub) — **not** product parity. |
| **Visual mismatch** | Reachable but **clearly worse or off-brand** vs deployed PWA — requires **VP-2** correction before feature work. |
| **Visual parity** | Matches PWA chrome (color, type, spacing, glass, nav, logos, hierarchy) for that surface. |
| **Read parity** | Correct read model + loading/empty/error states; approved `.from()` only. |
| **Interaction parity** | Gestures, navigation, filters, and non-destructive controls match PWA intent. |
| **Write / action parity** | Mutations and product actions available (gated phase + audit). |
| **Realtime parity** | Live updates where PWA has them (chat, notifications, presence UI, etc.). |
| **Native-enhanced full parity** | **Done** for that surface: full equivalence **plus** deliberate native-quality wins (performance, haptics, transitions) **without** changing identity or behavior. |

**Explicit non-parity checkpoints (do not mislabel):**

| Checkpoint | What it actually is |
|------------|---------------------|
| **`VP-1`** | **Route / IA scaffold** + light chrome — **not** visual parity, **not** product parity. |
| **`P2O-A`** | **Map engine + read-only `venues` pins** — **not** web map UX parity (no heat, filters, sheets, GPS puck). |
| **Phase 2O reads** | **Data plane** for approved tables — **not** full surface parity. |

**Native is not complete** until a user can do **everything** they can on the PWA, with the **same Intencity identity**, and native is **not worse** on any critical path.

---

## Native Full Parity Doctrine

> **Superseded in strictness by [Native Product Equivalence Doctrine](#native-product-equivalence-doctrine)** above. This section retains the engineering ladder shorthand; **“parity” always means exact user-facing equivalence**, not scaffold completeness.

**Canonical goal:** **`apps/mobile` must eventually become a complete native equivalent of production `apps/web` / PWA** — not merely the five bottom tabs, not a redesigned “mobile-first” Intencity, and not an open-ended accumulation of placeholders. Until that end state is reached, **`apps/web` remains production and UX source of truth**; native **mirrors** web/PWA (**no parallel IA redesign**).

**What “complete native equivalent” means (non-exhaustive but binding intent):**

- **Every production PWA route** and **user-visible surface** (including **`/`** landing, splash/boot, loading gates, auth **and recovery**, onboarding branches, Hub, Map, Moments/stories, story viewer and share flows, chat list/thread, profile/edit, friends/blocks, public **`/u/[username]`**, notifications/activity, full settings/account/legal subtree, global search/discovery, live places, venue activity, venue detail/pop-ups/bottom sheets, map overlays filters heat cards, plus **any overlays/modals implemented inside** shell pages such as **`map/page.tsx`**, **`hub/page.tsx`**, **`AppShell`**).
- **Every state class:** loading, empty, error, offline/degraded — matched to native **as those states exist on web** once the surface is being implemented.
- **Every visual treatment** that defines the product chrome: spacing, typography, glass, cards, rails, avatar/story-ring treatments, navigation affordances — **convergent with web**, not reinterpreted without an explicit parity exception.
- **Every behavior**, **once** gated for native: deterministic logic aligns with **`packages/shared`** wherever applicable; **`packages/shared` timing/presence constants** must not change casually ([SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md)).

**`VP-1` / `P2O-A` are engineering checkpoints — not parity.** **`ParityPlaceholderScreen` / routed shells are scaffolds only.** Missing or mismatched surfaces remain **tracked in the master backlog** ([PWA_NATIVE_PARITY_AUDIT.md §11](./PWA_NATIVE_PARITY_AUDIT.md#11-full-parity-backlog-master)) until **Native-enhanced full parity** per the [status ladder](#native-product-equivalence-doctrine).

**Capability dimensions** (orthogonal to the per-surface ladder; still used for phase planning):

| # | Dimension | Meaning |
|---|-----------|--------|
| **Reads** | Approved data + state classes on screen. |
| **Interactions** | Non-destructive controls aligned with PWA. |
| **Writes / actions** | Mutations — named phase + audit only. |
| **Realtime** | Live transports where PWA has them. |
| **Native platform** | Push, deep links, camera, keyboard, store rules — phased. |

**Backlog uses the [nine-stage ladder](#native-product-equivalence-doctrine)** (including **Visual mismatch** and **Native-enhanced full parity**), plus extended columns in the audit (visual/behavior status, reads/writes, blockers, worse-than-PWA flag, redesign correction, native upgrade opportunity).

**Grouping future phases by capability:** New work MUST be categorized by **what dimension it advances** (map engine vs read-expansion vs realtime vs writes vs native platform — see **[Recommended capability roadmap](./PWA_NATIVE_PARITY_AUDIT.md#recommended-capability-roadmap)** in the audit).

---

**Current era:** **Era 3 — Evolve** ([PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md) · [ERA_3_EVOLVE_PLAN.md](./ERA_3_EVOLVE_PLAN.md)) · Era 1 Mirror ✅ · Era 2 Notifications ✅

**Current phase:** **`EVOLVE-1`** — acquisition precision + local map puck (no `user_presence` writes). **Web remains production** and **sole `user_presence` writer** until **Era 5 (`P2O-D`)**.

Optional polish: [VP2X_EXECUTION_STABILITY_AUDIT.md](./VP2X_EXECUTION_STABILITY_AUDIT.md) (non-blocking).

---

## Current mobile status (Era 1 — Mirror, post **`MAP-B/C`**)

| Area | Status |
|------|--------|
| **Expo scaffold** | ✅ `apps/mobile` — Expo SDK 54, expo-router, dev client config, EAS skeleton |
| **Supabase auth** | ✅ Email/password, SecureStore session, sign in / sign out |
| **Native shell UI** | ✅ Phase 2C — dark Intencity theme, safe areas, loading / login |
| **Product navigation** | ✅ Phase **2H** + **2I** + **`VP-1`** — tabs under `(app)/(tabs)` inside a **`Stack`**; read-only **PWA-shaped** pushes (`/friends`, legal routes, **`/chat/[id]`** / **`/moments/[id]`** / **`/u/[username]`** scaffolds, …) |
| **Profile hydration** | ✅ Phase 2F — read-only `profiles` row for signed-in user on Profile tab |
| **`@intencity/shared`** | ✅ Harmless smoke on Hub tab (`MAP_ACTIVITY_WINDOW_MS`) — **windows unchanged** |
| **Production presence authority** | ❌ **Web/PWA only** — native **reads** presence; **does not write** until Era 2 |
| **`expo-location` / GPS** | ✅ **`P2O-B`** — foreground watch on Map; **no** presence writes |
| **`user_presence`** | ✅ **Read** (`PresenceProvider`) · ❌ **Write** (**`P2O-D` = Era 2**) |
| **Map** | ✅ Engine + heat/glow + friends + venue sheet + Live Places |
| **Chat** | ✅ Send + thread/list realtime (`CHAT-1`, `REALTIME-1`) |
| **Notifications** | **Era 2 active** — NOTIF-1 ✅ · **NOTIF-3 next** ([NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md)) |
| **Media** | ✅ **MEDIA-1** — moment/share interactive crop + avatar upload ([MEDIA_1_SLICE.md](./MEDIA_1_SLICE.md)) |
| **Profile edit** | ✅ Text fields + avatar (was partial) |
| **Settings** | ✅ **SETTINGS-1** — Supabase notification prefs, private account, pause/delete ([SETTINGS_1_SLICE.md](./SETTINGS_1_SLICE.md)) |
| **Blocks** | ✅ **BLOCKS-1** — unblock on `/blocks` ([BLOCKS_1_SLICE.md](./BLOCKS_1_SLICE.md)) |
| **`P2O-D`** | **Deferred (final)** — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) |

**Production product today:** `apps/web` (PWA) — map, venues, stories/shares, chat, profile, friends, notifications, and **all** physical presence writes.

### UX / navigation (do not confuse with production)

**Web/PWA is the source of truth** for UX, navigation hierarchy, visuals, behavior, legal copy interpretation, **and parity targets** ([Native Full Parity Doctrine](#native-full-parity-doctrine)). **`apps/mobile` today is partial capability on the disciplined path toward a **full native equivalent of PWA**, not parallel product redesign.

Missing or ribboned routes **stay tracked** ([full parity backlog](./PWA_NATIVE_PARITY_AUDIT.md#11-full-parity-backlog-master)) until **`Full native parity`** ([status ladder](#native-full-parity-doctrine)). **`VP-1` placeholders are scaffolds only.**

| Web/PWA (production) | Native today (**2O** data + **`VP-1`** UX shell) |
|----------------------|--------------------------------------------------|
| Hub feed (`/hub`) | **Hub** — same **2M** sections + **local** search across loaded friends / venues / shares (**2O**) |
| **Map** (primary core, `/map`) | **Map** — **`P2O-A`** Mapbox shell + **`venues`** dots/labels (catalog coords) + **`2O`** venue list/filter — **still no GPS / `user_presence` / heat** |
| Stories / Moments (center, `/stories`) | **Moments** tab (Expo route `create`) — labeling matches BottomNav Stories; **no** camera/upload |
| Chat (`/chat`) | **Chat** — previews + **2O** search; tap row → **`/chat/[id]`** read-only scaffold (no composer) |
| Profile (`/profile`) | **Profile** — **2F** hydration; Friends stat → **`/friends`** roster (**2K** reads); ⋯ menu lists PWA parity shells |
| Search (integrated + `/search`) | **2O** embedded search on Hub · Chat · Map; **`/search-discovery`** is a **VP-1** **placeholder** (**no new `.from()`**) |
| Secondary PWA surfaces (friends, blocks, notifications, legal, archive, `/shares/new`, …) | **`VP-1` `ParityPlaceholderScreen`** shells + **`/friends`** real read-only roster — **writes deferred** |

**`VP-1` chrome:** Glass **sheen** overlay (blur-free Expo Go parity), typography tokens (`typography.ts`), tab inactive tint **~65%** white vs accent. **Live** Mapbox/GPS/`user_presence`/realtime — **still Post–2O**. Details: [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md#ux-source-of-truth-critical).

---

## Phase summary

| Phase | Name | Status | Delivers |
|-------|------|--------|----------|
| **0** | Monorepo migration | **Complete** | `apps/web`, npm workspaces, root install |
| **1** | Shared deterministic engine | **Complete** | `packages/shared`, web shims, production `computePresenceFromGps` |
| **2A** | Native architecture docs | **Complete** | Migration docs under `docs/` |
| **2B** | Mobile scaffold | **Complete** | `apps/mobile`, auth, `@intencity/shared` smoke, Expo Go verified |
| **2C** | Native shell polish | **Complete** | Branded dark UI, safe areas, loading/login/home — auth logic unchanged |
| **2D** | Docs + audit checkpoint | **Complete** | Boundaries reconfirmed; audits pass — **no app logic** |
| **2E** | Native read-only product shell | **Complete** | Bottom tabs + placeholder Home/Search/Activity/Profile — **no data, no GPS** |
| **2F** | Read-only profile hydration | **Complete** | Profile tab reads current user's `profiles` row — **no edit, no presence** |
| **2G** | Web-parity native navigation **plan** | **Complete** | Documented target nav vs 2E scaffold — planning only |
| **2H** | Native nav parity **shell** | **Complete** | Hub / Map / Create / Chat / Profile placeholders — **still read-only** |
| **2I** | Visual parity **shell** | **Complete** | Floating/glass nav, tighter layout, product-like placeholders — **no data/presence changes** |
| **2J** | Read-only data **plan + gates** | **Complete** | Documented ladder **2K–2O** + approved/forbidden table — **docs only**, no new Supabase reads in app |
| **2K** | Friends / social graph | **Complete** | Read-only accepted friends — `friend_requests` + `blocks` + `profiles` (mirrors web `acceptedFriendIdsExcludingBlocks`) |
| **2L** | Venues | **Complete** | Read-only **`venues`** — Hub live-places rail + Map static preview — **no** Mapbox/GPS/`user_presence` |
| **2M** | Hub feed / moments | **Complete** | Read-only **`stories`** (friend shares) + `profiles` hydrate — Hub **Shares** list; **no** likes/comments API, **no** realtime |
| **2N** | Chat list | **Complete** | Read-only **`chats`** + **`messages`** + peer **`profiles`** — list previews only; **no** send, subscriptions, or `notifications` mutations |
| **2O** | Integrated search | **Complete** | **Local-only** Hub / Chat / Map filters over **already-loaded** rows — **`useDebouncedValue`**, **`useLocalSearchQuery`**, **`localSearch`** helpers — **no** new `.from()` / realtime / writes |
| **`VP-1`** | Native visual parity checkpoint | **Complete** | **Stack + `(tabs)`** layout, **Moments** tab title, Profile overflow → PWA routes, **`ParityPlaceholderScreen`** for risky flows, **`/friends`** read-only roster, chat-row → **`/chat/[id]` scaffold** — **still zero** net-new Supabase tables vs **2O** |
| **`VP-2A`** | Core brand / shell / identity | **Complete** | Global tokens, icon/splash, landing + auth shells, tab chrome, product copy — **no** new reads/writes/GPS/presence |
| **`VP-2B`** | Screen architecture / interaction-ready visual | **Complete** | Hub/Map/Chat/Profile structure, skeletons, map immersive chrome + venue sheet scaffold, chat thread shell — **no** new capability |
| **`VP-2C`** | Residual parity audit + honesty pass | **Complete** | Side-by-side matrix [§12](./PWA_NATIVE_PARITY_AUDIT.md#12-vp-2-residual-parity-matrix-side-by-side-audit), dependency audit [§13](./PWA_NATIVE_PARITY_AUDIT.md#13-native-dependency-audit-web-vs-mobile), misleading-UI fixes (no fake chat/unseen/engagement) |
| **`VP-2`** | Final atmospheric + visual parity | **Signed off (2026-05-18)** | Cohesion pass + media viewing + honest placeholders — [VP2_COMPLETION_AUDIT.md](./VP2_COMPLETION_AUDIT.md) |
| **Post–2O** | Map / GPS / presence (sliced) | **`P2O-A/B/C`✅ · `MAP-B/C`✅** | Reads + map UX; **`P2O-D` writes = Era 2** — **[PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md)** |

**Renumbering note:** **2F** first product read (own `profiles`). **2K** social graph. **2L** **`venues`**. **2M** **`stories`** (Hub shares). **2N** **`chats`** / **`messages`** (list previews). **2O** search; **`VP-1`** UI/navigation scaffolding on top (**no extra `.from()`**); **Post–2O** for map/presence. Each phase = PR + `rg "\.from\(" apps/mobile` audit.

---

## Next allowed phase (important)

Do **not** add any of the following without a written phase plan, presence-ownership review, and explicit approval:

- `expo-location` or background location
- Geofencing / task-manager location
- **`@rnmapbox/maps`** with **GPS / location puck / follow-user modes** (**`P2O-B`** onward — **`P2O-A`** is catalog-coordinate **`venues`** only)
- `user_presence` **reads** on native — **forbidden** through **2O**; only a **future, explicitly named** phase (post–2O or separate doc) may allow read-only presence **display**
- `user_presence` **writes** (except in a gated beta phase per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md))
- Changing production presence ownership

**Safe without a new phase:** mobile UI polish that does **not** add new `supabase.from(...)` beyond approved **2O**-era tables (**2O** search is **strictly client-side**). **`VP-1` fit entirely in this bucket** (layout + placeholders + typography). **`P2O-A`**-scoped **`@rnmapbox/maps`** polish stays inside already-approved **`venues`** reads (**`P2O-A`** **complete**).

### Implementation gate order

| Order | Slice | Status |
|-------|--------|--------|
| 1 | **`VP-2A`** — Core brand / shell / identity | **Complete** |
| 2 | **`VP-2B`** — Screen architecture / interaction-ready visual | **Complete** |
| 3 | **`VP-2C`** — Residual parity audit + honesty pass | **Complete** — §12–§14 [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) |
| 4 | **`VP-2`** — Final atmospheric + visual parity | **Signed off (2026-05-18)** — see [VP2_COMPLETION_AUDIT.md](./VP2_COMPLETION_AUDIT.md) |
| 4b | **`VP-2D`** / **`VP-2X`** — Glass + orchestration polish | **Optional backlog** — not blocking geography |
| 5 | **`P2O-B`** — foreground **`expo-location`** | **Complete** |
| 6 | **`P2O-C`** — `user_presence` read-only | **Complete** (`PresenceProvider`, map/hub/live-places) |
| 7 | **`MAP-B/C`** — friend + venue confidence UI | **Complete** — see [MAP_C_SLICE2.md](./MAP_C_SLICE2.md), [LIVE_PLACES_SLICE.md](./LIVE_PLACES_SLICE.md) |
| 8 | **Era 1 Mirror** | **Signed off 2026-05-18** |
| 9 | **`NOTIF-3`** — badges + toasts | **Next** — [NOTIF_ERA_PLAN.md](./NOTIF_ERA_PLAN.md) |
| 10 | **`NOTIF-2`** — native notify creates (action-triggered) | Planned |
| 11 | **`NOTIF-4`** — device push | Planned |
| 12 | **Web cutover** (optional) | Marketing-only web — can defer |
| 13 | **`P2O-D`** — `user_presence` writes | **Final** — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) |

**Next implementation slice:** **`NOTIF-3`** — **not** `P2O-D`. Web stays full production for presence QA.

**`VP-2` scope (strict):** Auth, Hub, Map **chrome** (not new map features), Chat, Profile, Moments tab, Friends, placeholders, tab bar, loading/empty/error presentation — **no** `expo-location`, **no** `user_presence`, **no** new `.from()`, **no** writes, **no** realtime, **no** camera. **`P2O-A`** map tiles may be refined visually but **no** GPS puck or presence layers.

**`P2O-B`–`P2O-D` order** after **`VP-2`**: unchanged in [Post–2O roadmap checkpoint](#post-2o-roadmap-checkpoint).

**Gate:** **`P2O-A`** introduces **`@rnmapbox/maps`** with already-approved **`venues`** reads only. Native **must not** add net-new `.from(...)` targets, **`user_presence`** I/O, **`expo-location`** (outside the named **`P2O-B`**+ location slice), unsolicited realtime pipelines, or product writes without updating this doc (named slice + `rg "\\.from\\("` audit) — [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) rule 9.

**Parity completeness:** Capability slices move native toward **[full PWA equivalency](#native-full-parity-doctrine)**; route-level status stays in [§11 backlog](./PWA_NATIVE_PARITY_AUDIT.md#11-full-parity-backlog-master). **`VP-1` scaffolds are never “done”.**

---

## Phase 0 — Monorepo migration ✅

**Checkpoint:** `e066023` — stabilized post-feature Phase 0

- `apps/web` is the production Next.js app
- Root `package.json` workspaces: `apps/*`, `packages/*`
- Install from repo root; env at root `.env.local`

**Verify:** `npm run build` from root

---

## Phase 1 — Shared deterministic engine ✅

**Checkpoint:** `2efb525` — Phase 1 finalized cleanup

- `@intencity/shared` — pure TS, 24 unit tests (`npm run test:shared`)
- Web wires `computePresenceFromGps`, freshness shims, heat shim
- **Unchanged:** `AppShell.tsx`, `map/page.tsx`, `notifications.ts`, PWA, schema, RLS
- Web still sole writer of `user_presence`

**Verify:** `npm run test:shared` and `npm run build`

---

## Phase 2A — Native architecture docs ✅

Artifacts: [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md), [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md), this file.

---

## Phase 2B — Mobile scaffold ✅

- `apps/mobile` — Expo + expo-router + expo-dev-client + EAS skeleton
- Supabase auth (`signInWithPassword`) with SecureStore
- Routes: `/login`, tab shell under `/(app)/` (`home`, `search`, `activity`, `profile`)
- `@intencity/shared` smoke on home
- Bundle ID: `com.intencity.app`
- Metro monorepo config (singleton React resolution)
- Verified on device via **Expo Go**

**Out of scope (unchanged):** `user_presence`, `expo-location`, map, push, `apps/web/src` changes

---

## Phase 2C — Native shell polish ✅

**Goal:** Polish the auth shell into a clean Intencity-branded native app **without** new product behavior.

**What changed:**

- Dark / clean Intencity styling (aligned with web tokens: charcoal + electric blue)
- Safe-area-aware layout (`react-native-safe-area-context`)
- Branded loading screen (`AppLoadingScreen` + wordmark)
- Polished sign-in screen (login)
- Polished signed-in home scaffold (account info + Phase 2C copy)
- **Auth logic unchanged** — same Supabase `signInWithPassword` / `signOut`, no `profiles` table reads
- **Shared smoke still present** — subtle `@intencity/shared` lines on home
- Reusable UI primitives under `apps/mobile/src/components/` and `src/theme/colors.ts`

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, background tracking, or geofencing
- No map, push, or hub/chat/stories surfaces
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — loading → login → home → sign out; `npx tsc --noEmit` in `apps/mobile`

---

## Phase 2D — Documentation + audit checkpoint ✅

**Goal:** Update migration docs and re-run audits so the repo clearly reflects Phase 2C completion and safe boundaries before any native feature work.

**Deliverables:** Updated `docs/*`, `apps/mobile/README.md`, root `README.md`; audit log in this section.

### Phase 2D audit results (checkpoint)

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile` app source | ✅ Not present (auth only) |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual (not automated):** Expo Go auth flow on phone — verified during Phase 2B/2C.

---

## Phase 2E — Native read-only product shell ✅

**Goal:** Make the native app **structurally resemble** the Intencity product (tabs + placeholder surfaces) while remaining completely **non-authoritative**.

**What changed:**

- Bottom tab navigator: **Home**, **Search**, **Activity**, **Profile** (`app/(app)/_layout.tsx`) — **migration scaffold only**; production web uses hub / map / create / chat / profile (search integrated, not a fixed tab)
- Placeholder tab screens with Phase 2E copy (no Supabase table queries)
- **Home:** live city / venues + friends preview shell; subtle `@intencity/shared` smoke
- **Search:** friends/venues discovery shell
- **Activity:** stories/notifications shell
- **Profile:** auth user email/id + sign out (moved from old single home screen)
- Reusable shell components: `ShellCard`, `ShellListRow`, `TabScreenHeader`
- `Screen` supports `edges` prop for tab-safe safe areas
- Auth guard unchanged: signed out → login; signed in → `/home` tab shell

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, background tracking, geofencing, Mapbox, or push
- No Supabase `.from()` table reads (auth session only)
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — login → four tabs → profile sign out; `npx tsc --noEmit` in `apps/mobile`

### Phase 2E audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present (placeholder copy in `home.tsx` only) |
| `.from(` in `apps/mobile/app` + `src` | ✅ None |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual:** Expo Go — login → bottom tabs (all four) → profile shows email/id → sign out → login.

---

## Phase 2F — Read-only profile hydration ✅

**Goal:** Safely hydrate native with read-only Supabase product data — **signed-in user's `profiles` row only**.

**What changed:**

- `fetchMyProfile` + `useMyProfile` — `profiles` select for `auth.user.id` only
- Profile tab: username, display name, avatar, bio; loading / empty / error states
- Auth email/user id fallback when row missing or fetch fails
- **No** profile edit, avatar upload, or other table reads

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, background tracking, geofencing, or push
- No friends, venues, stories, messages, or notifications reads
- No changes to `packages/shared` presence timing/windows
- No changes to `apps/web/src` or `packages/shared`

**Verify:** Expo Go — Profile tab shows hydrated row or auth fallback; `npx tsc --noEmit`

### Phase 2F audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` in `apps/mobile` source/deps | ✅ Not present |
| `user_presence` in `apps/mobile/src` | ✅ Not present |
| `user_presence` in `apps/mobile/app` | ✅ Placeholder copy only (`home.tsx`, `profile.tsx`) |
| `.from(` in `apps/mobile/src` | ✅ `profiles` only (`fetchMyProfile.ts`) |
| `git diff HEAD -- apps/web/src` | ✅ No changes vs HEAD |
| `git diff HEAD -- packages/shared` | ✅ No changes vs HEAD |

**Manual:** Profile tab — data if row exists; auth fallback if not; sign out works.

---

## Phase 2G — Web-parity native navigation plan ✅

**Goal:** Document how native navigation should **converge toward** the deployed web/PWA app — **without** implementing risky product behavior (map engine, GPS, presence, or new Supabase reads).

**Status:** Complete (docs). Implementation delivered in **Phase 2H**.

### Production web/PWA navigation (source of truth)

Reference: `apps/web/src/components/BottomNav.tsx` and related shell.

| Surface | Role |
|---------|------|
| **Hub** (`/hub`) | Home feed — stories, venue energy, social pulse |
| **Map** (`/map`) | **Primary core surface** — map-centered going-out experience |
| **Create** (center) | Stories / share capture |
| **Chat** (`/chat`) | Messages and conversation |
| **Profile** (`/profile`) | Account, moments, settings entry |
| **Search** | Integrated into hub, map, and overlays — **not** a permanent bottom tab on web |

### Current native tabs (temporary — do not extend as canonical)

| Native tab (2E) | Web analogue | Notes |
|-----------------|--------------|--------|
| Home | Hub | Placeholder only |
| Search | Integrated search | **Scaffold only** — web does **not** mirror this as a fixed tab |
| Activity | Chat / activity | Placeholder only |
| Profile | Profile | Phase 2F: read-only own `profiles` row |

### Target native bottom navigation (future — Phase 2H+)

Replace the four-tab scaffold with **web-parity** items:

| Tab | Purpose | Implementation order |
|-----|---------|----------------------|
| **Hub** | Feed / home surface shell | Placeholder first |
| **Map** | Map-centered product shell | **Placeholder shell first** — no Mapbox, no GPS, no venue/presence data |
| **Create** | Share / stories entry | **Placeholder only** until stories/share migration |
| **Chat** | Messages shell | Placeholder first |
| **Profile** | Account (2F hydration continues) | Keep read-only `profiles` |

**Search:** Likely **integrated search** (modal / overlay / per-surface entry) — **not** a permanent bottom tab — matching web. Remove or demote the current Search tab when 2H lands.

Visual direction (later): floating / glass bottom control aligned with web tokens — not required in 2H shell.

### Do not implement yet (2G scope boundary)

| Forbidden in 2G (and in 2H shell without a later phase) | Reason |
|-----------------------------------------------------------|--------|
| Mapbox / map SDK | Map engine is a dedicated phase after shell |
| `expo-location`, live GPS, background location, geofencing | Presence ownership — web remains writer |
| `user_presence` reads or writes | No dual-write; no display without plan |
| Changing `@intencity/shared` timing / activity windows | Cross-platform display contract |
| Independent native IA redesign | Web/PWA is UX source of truth |
| New Supabase table reads (friends, venues, messages, etc.) | **2K–2O** only, one phase per PR + audit ([Phase 2J](#phase-2j--native-migration-read-only-data-plan--gates-)) |

### Deliverables (2G)

- Updated [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) § UX and Phase 2G/2H
- This file — phase table, 2G/2H definitions
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) — nav planning gates
- [apps/mobile/README.md](../apps/mobile/README.md) — target vs temporary tabs

**Verify (2G):** `npm run test:shared`; `cd apps/mobile && npx tsc --noEmit`; `git diff HEAD -- apps/web/src packages/shared` empty for doc-only work.

---

## Phase 2H — Native nav parity shell ✅

**Goal:** Restructure native bottom navigation to match web/PWA **labels and hierarchy** using **placeholder screens only** — still read-only, still non-authoritative.

**What changed:**

- Bottom tabs: **Hub**, **Map**, **Create**, **Chat**, **Profile** (`app/(app)/_layout.tsx`)
- Routes: `hub`, `map`, `create`, `chat`, `profile` — removed `home`, `search`, `activity`
- Signed-in default: `/hub` (login, index, auth layout)
- **Search** removed as a permanent bottom tab (web uses integrated search)
- **Create** tab uses a subtle center-action style (accent circle when focused)
- Placeholder screens for Hub, Map, Create, Chat; Profile keeps Phase 2F `profiles` hydration
- `@intencity/shared` smoke moved to Hub tab

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, GPS, background tracking, geofencing, or push
- No new Supabase table reads — still `profiles` only on Profile
- No changes to `apps/web/src` or `packages/shared` timing constants
- No profile edit or avatar upload on native

**Verify:** Expo Go — login → Hub → five tabs → Profile hydration → sign out; `npx tsc --noEmit`

### Phase 2H audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ 24/24 pass |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` | ✅ Not present (placeholder copy only) |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Placeholder copy only (`map.tsx`, `profile.tsx`) |
| `.from(` in `apps/mobile` | ✅ `profiles` only (`fetchMyProfile.ts`) |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

**Manual:** Login → lands on Hub → all five tabs open → Profile shows `profiles` or auth fallback → sign out.

---

## Phase 2I — Visual parity shell ✅

**Goal:** Move native **visual feel** closer to deployed web/PWA (dark premium, glass nav, compact density) without new behavior, data reads, or presence.

**What changed:**

- Floating glass-style bottom tab bar (`FloatingTabBar`) — web-like center Create emphasis
- Tighter screen padding and card density (`layout` tokens, updated `ShellCard` / rows)
- Hub: search pill, moments rail, live places chips, feed sections (placeholders)
- Map: static map canvas with venue dots (no Mapbox/GPS)
- Create: center share hero + action list shell
- Chat: Messages header, search pill, thread list placeholders
- Profile: compact hero, stats row shell, kept 2F `profiles` hydration
- Reduced migration-doc copy on screens

**What did not change:**

- Same 2H routes; no new Supabase reads; no `user_presence`; no location SDKs
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; boundary greps; Expo Go visual pass

---

## Phase 2J — Native migration read-only data plan + gates ✅

**Goal:** Lock a **clear ladder** and **gates** for future native read-only Supabase usage **before** any new `.from()` calls ship. **Docs and process only** — **no** new table reads, **no** UI behavior change, **no** app code in 2J.

**Deliverables:**

- This section + [Planned read-only ladder (2K–2O)](#planned-read-only-data-implementation-phases-not-started)
- [NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md) — read-only data migration ladder
- [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) — confirms **no** ownership / writer rule changes in 2J
- [SACRED_FILES_AND_RULES.md](./SACRED_FILES_AND_RULES.md) — `.from()` gate rule
- [apps/mobile/README.md](../apps/mobile/README.md) — approved access list

### Approved vs forbidden — native Supabase / product data (through Phase 2O)

| Category | Native (until a named **Post–2O** implementation slice ships) |
|----------|-----------------------------------|
| **Approved reads** | **`profiles`** — own row + accepted friends’ display rows + DM counterpart rows; **`friend_requests`**, **`blocks`** (2K); **`venues`** (2L); **`stories`** — read-only Hub **Shares** rows for self + accepted friends, same filters as web `loadHubFriendShares` (2M); **`chats`** — rows where user is **`user1_id`** or **`user2_id`**; **`messages`** — read-only preview fetch (latest row per **`chat_id`**, same columns as web list load — **2N**). Auth session APIs (not `.from()`). |
| **Approved client-only UX (no new `.from()` )** | **2O** — debounced substring search over **in-memory copies** of data already fetched for Hub, Chat, and Map (Places list). |
| **Forbidden reads** | **`user_presence`**; any `.from()` table **not** listed here or in an approved later phase doc update. |
| **Forbidden writes** | All `user_presence` writes; all product writes unless a future gated phase says otherwise. |
| **Forbidden SDKs** | `expo-location`, Mapbox / `@rnmapbox/maps`, background tracking, geofencing, push (until respective phases). |
| **Forbidden shared edits** | Changing `MAP_ACTIVITY_WINDOW_MS`, `RECENT_WINDOW_MS`, `FRIEND_ONLINE_BADGE_MS`, or other `packages/shared` presence constants without a cross-platform plan. |

**Presence display constants (unchanged — do not edit in mobile or shared without migration review):**

| Constant | Value |
|----------|--------|
| `MAP_ACTIVITY_WINDOW_MS` | **20 minutes** |
| `RECENT_WINDOW_MS` | **60 minutes** |
| `FRIEND_ONLINE_BADGE_MS` | **4 minutes** |

**`user_presence` on native:** **Forbidden** for reads and writes through **2O** (and through any read-only social phase) unless a **later, explicitly documented** phase adds read-only presence **display** with its own gate — not part of **2K–2O** as specified here.

### Planned read-only data ladder (2K–2O)

Order is **mandatory** unless this doc is amended with rationale. Each phase: spec tables + RLS + `rg "\.from\(" apps/mobile` audit + `npm run test:shared` + `npx tsc --noEmit`.

| Phase | Focus | Intent |
|-------|--------|--------|
| **2K** | Friends / profile **social graph** | ✅ **Complete** — read-only accepted friends (`friend_requests`, `blocks`, `profiles`); Hub + Profile; **no** `user_presence` |
| **2L** | **Venues** | ✅ **Complete** — read-only venue lists / cards for Hub/Map shells — still **no** Mapbox/GPS |
| **2M** | **Hub feed / shares** | ✅ **Complete** — read-only **`stories`** (share rows) + **`profiles`** hydrate — **no** realtime / likes pipeline on native |
| **2N** | **Chat list** | ✅ **Complete** — read-only **`chats`** / **`messages`** / peer **`profiles`** — **no** subscriptions, send, thread navigation, or `notifications` mutations on native |
| **2O** | **Integrated search** | ✅ **Complete** — **debounced local** filtering on Hub (friends / venues / shares), Chat (preview rows), Map venue list — **zero** extra Supabase |

### Post-2O roadmap checkpoint

**Checkpoint:** **`P2O-A`/`P2O-B`/`P2O-C`** and **`MAP-B/C`** are **implemented** in **`apps/mobile`**. **`P2O-D`** is **not** the next Mirror slice — it is **Era 2** only ([PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md)). Slice **definitions** below remain **canonical**.

**UX / product authority:** **`apps/web` (PWA) remains the source of truth** for map behavior, presence semantics, and navigation. Native Post–2O slices **inherit** parity targets from web; they do **not** define parallel product rules.

#### Post-2O slice **`P2O-A`** (**complete** — Mapbox map shell + read-only venue rendering)
- Covers candidate items **(1) Mapbox visual map only** and **(2) Mapbox + read-only venue rendering**: a real **`@rnmapbox/maps`** (or Expo-supported Mapbox integration) surface using **already-approved** **`venues`** reads (**2L**) — pins / circles / labels from **`lat` / `lng`**, styling toward web map feel.
- **Explicitly excludes:** `expo-location` / GPS / user puck, **`user_presence` reads/writes**, new Supabase tables, new realtime pipelines, and **unsolicited** edits to **`apps/web/src`** / **`packages/shared`** presence constants.
- **Rationale:** Validate native map **stack** (dev client, tokens, builds, QA) **before** location privacy workflows or **dual-writer** presence.

#### Placement of options **(3)–(5)**

| Option | Verdict |
|--------|---------|
| **(3) Location permission only** | **Do not ship as a standalone phase.** Request permission with the first feature that **uses** location (typically **P2O-B** foreground location). |
| **(4) `user_presence` read-only display** | **After P2O-A** (map must render geography). Requires a **named phase**, **`.from("user_presence")`** approval, and RLS review. |
| **(5) `user_presence` writes** | **Last** — only per [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md) (metadata, cohort flag, single writer, rollback). |

#### Recommended sequence (summary)

**Era 1 — Mirror (in flight):**

1. **P2O-A** — Mapbox + read-only **`venues`**. **Complete** ✅  
2. **VP-2** — Visual identity pass. **Complete** ✅  
3. **P2O-B** — Foreground **`expo-location`**. **Complete** ✅  
4. **P2O-C** — Native **`user_presence` read-only**. **Complete** ✅  
5. **MAP-B/C** + **Live Places** + venue sheet. **Complete** ✅  
6. **Era 1 Mirror** — **Signed off 2026-05-18** ✅  

**Era 2 — Notifications (web still writes presence):**

7. **`NOTIF-3`** — Hub badge, message in-app toast, chat tab unread — **next**  
8. **`NOTIF-2`** — Native **`createNotification`** for native user actions (likes, comments, FR accepted); presence-driven types **still web** until **`P2O-D`**  
9. **`NOTIF-4`** — Device push (APNs/FCM)  

**Era 3 — Web cutover (optional):** marketing-only web — defer if PWA QA still needed  

**Era 4 — Final:**

10. **`P2O-D`** — Native **`user_presence` writes** — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md)  

**Era 5 — Evolve:** MAP-D, background location, …

**B–D** are **ordered placeholders** until scheduled; renaming (e.g. “Phase 3.x”) is fine if **one slice = one PR + audit** stays true.

---

### Post–2O — map engine, GPS, presence (explicit approval only)

Not part of **2K–2O**. **`P2O-A`** requires **`expo-dev-client`** for native Mapbox (**Expo Go** shows the decorative fallback). **`VP-2`** is **docs-gated UI-only** (no new native modules). **`P2O-B`** resumes only after **`VP-2`**; `expo-location` only in **`P2O-B`**+; [**PRESENCE_OWNERSHIP.md**](./PRESENCE_OWNERSHIP.md) gates any `user_presence` read/write. **`P2O-B`–`D` ordering unchanged** after **`VP-2`**.

---

## Phase 2K — Read-only accepted friends ✅

**Goal:** Hydrate native with the same **accepted friends set** as web (`acceptedFriendIdsExcludingBlocks` semantics) — **read-only**, **no** `user_presence`, **no** writes.

**What changed:**

- `fetchAcceptedFriends` + `useAcceptedFriends` — `friend_requests` (accepted) → `blocks` → `profiles` (`account_lifecycle_state = active`), batched `.in()` for profile ids
- Hub **Moments** rail: real friend rings (`FriendHubRing`) after “Your moment”; loading/error/empty copy
- Profile stats: **Friends** count from the same hook

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, push, or new writes
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` grep includes only `profiles`, `friend_requests`, `blocks`

### Phase 2K audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ (run on merge) |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present |
| `.from(` in `apps/mobile` | ✅ `profiles`, `friend_requests`, `blocks` only |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

---

## Phase 2L — Read-only venues ✅

**Goal:** Hydrate Hub and Map shells with the same **canonical venue catalog** the web app uses — **read-only**, **no** device GPS, **no** Mapbox, **no** `user_presence`, **no** writes.

**What changed:**

- `fetchVenuesPreview` + `useVenuesPreview` — `venues` select `id, name, category, lat, lng`, ordered by name, capped (60)
- Hub **Live places** rail: real `VenueChipPlaceholder` rows + loading/error/empty + copy that live heat stays on web
- Map tab: static decorative canvas **unchanged in role** + read-only venue name list + banner that Mapbox/GPS are later

**What did not change:**

- No `user_presence` reads or writes
- No `expo-location`, Mapbox, push, realtime subscriptions, or new writes
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` grep includes `profiles`, `friend_requests`, `blocks`, `venues`

### Phase 2L audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ (run on merge) |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` + `package.json` | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present |
| `.from(` in `apps/mobile` | ✅ `profiles`, `friend_requests`, `blocks`, `venues` only |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

---

## Phase 2M — Read-only Hub shares (`stories`) ✅

**Goal:** Match web Hub **`Shares`** section using the same **`public.stories`** share rows and **`profiles`** hydration as `apps/web/src/app/hub/page.tsx` (`loadHubFriendShares`) — **read-only**, **no** `user_presence`, **no** realtime, **no** writes.

**What changed:**

- `fetchHubFeedPreview` + `useHubFeedPreview` — `stories` select `id, user_id, image_url, created_at, expires_at, is_share, share_visible, share_hidden` for `user_id` in `{me} ∪ {accepted friends}`, ordered by `created_at` desc, limit 200; filter `is_share`, `share_hidden`, `share_visible` like web; `profiles` batched for owners (native uses `image_url` only — production schema has no `media_url`)
- Hub section order aligned with web: **Moments** → **Active friends** (read-only empty-state copy) → **Live places** → **Shares** (`HubSharePreviewCard` — header + media, no actions)
- `hubFeedSemantics` (`isStoryRowShareFlag`), `socialTime` (`formatSocialAgo`) — duplicated from web helpers (not imported from `apps/web`)

**What did not change:**

- No `user_presence` reads or writes; no `expo-location`, Mapbox, push, camera, uploads, realtime subscriptions
- No changes to `apps/web/src` or `packages/shared` timing constants

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` grep includes `profiles`, `friend_requests`, `blocks`, `venues`, `stories`

### Phase 2M audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ (run on merge) |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` + `package.json` | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present |
| `.from(` in `apps/mobile` | ✅ `profiles`, `friend_requests`, `blocks`, `venues`, `stories` only |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

---

## Phase 2N — Read-only chat list previews ✅

**Goal:** Hydrate native **Messages** (`/chat` parity shell) using the **same initial read queries** as web `apps/web/src/app/chat/page.tsx` — **`chats`** (user is **`user1_id`** or **`user2_id`**), **`messages`** (latest **`created_at`** per **`chat_id`** for those ids), counterpart **`profiles`** (`id`, `username`, `display_name`, `avatar_url`) — **read-only**, **no** realtime, **no** `user_presence`, **no** writes, **no** thread navigation/send.

**What changed:**

- `fetchChatPreviews` + `useChatPreviews` — pair-dedupe of chat rows like web; batched **`profiles`** and **`messages`** `.in()` (chunked **80**)
- **`formatChatListTime`** — matches web `formatListTime` for row timestamps (**not** imported from web)
- `ChatTabScreen` — loading / empty / error + real `ChatThreadRow` previews; **Unread** dot from **snapshot** (`receiver_id === me && !seen`) only — stale until next mount/refetch (**no** live counts)

**What did not change:**

- Web remains authoritative for composing, realtime `messages`, `notifications`, and inbox freshness
- No `packages/shared` timing constants touched; no `apps/web/src` edits

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` grep includes `profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages`

### Phase 2N audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ (run on merge) |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| `expo-location` / `mapbox` in `apps/mobile` app + `src` + `package.json` | ✅ Not present |
| `user_presence` in `apps/mobile/app` + `src` | ✅ Not present |
| `.from(` in `apps/mobile` | ✅ `profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages` only |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ No changes vs HEAD |

---

## Phase 2O — Integrated local search (Hub / Chat / Map) ✅

**Goal:** Ship **web-shaped integrated search** without a fixed Search tab: **debounced in-memory** filtering over rows **already loaded** for each tab — **no** new **`supabase.from(...)`**, **no** realtime, **no** writes, **no** `user_presence`, **no** navigation / route changes.

**What changed:**

- **`useDebouncedValue`**, **`useLocalSearchQuery`** — shared debounce + **`intentActive`** (immediate) vs filter on **`debouncedQuery`**
- **`localSearch`** (`normalizeLocalSearchQuery`, `matchesLocalSearch`) — token AND / substring match helper
- **`SearchFieldPlaceholder`** — optional controlled **`TextInput`** (glass field) when **`onChangeText`** is passed
- **Hub** — search replaces main feed while query non-empty; **`GlassSurface`** results (Friends / Places / Shares) via **`ShellListRow`**; pending + empty copy
- **Chat** — filter previews by peer username/display/title/snippet
- **Map** — **`Places in app`** list + peek row filtered locally

**What did not change:**

- Approved **`.from()`** table set (**2N** unchanged); **`packages/shared`** windows untouched; **`apps/web/src`** untouched

**Verify:** `npx tsc --noEmit`; `npm run test:shared`; `.from(` unchanged vs **2N**; `git diff HEAD -- apps/web/src packages/shared` empty

### Phase 2O audit results

| Check | Result |
|-------|--------|
| `npm run test:shared` | ✅ |
| `cd apps/mobile && npx tsc --noEmit` | ✅ Pass |
| New `supabase.from` / realtime / writes | ✅ None added |
| `git diff HEAD -- apps/web/src packages/shared` | ✅ Empty |

---

## Architecture diagram

```
Today (post–2O read-only ladder done):
  apps/web ──reads/writes──► Supabase (user_presence)  ← production authority
       │
       └──► @intencity/shared

  apps/mobile ──auth──► Supabase (auth session)
       │
       ├──► profiles (own row + accepted friends + chat counterparts)
       ├──► friend_requests (accepted edges), blocks (exclusions)
       ├──► venues (read-only catalog for Hub + Map preview)
       ├──► stories (read-only Hub share rows for self + friends)
       ├──► chats + messages (read-only conversation list previews)
       ├──► Tab shell — Hub / Map / Create / Chat / Profile
       └──► @intencity/shared (display smoke on Hub)

  Local search (2O): in-memory filter only — no extra Supabase calls

After post–2O (gated — not started):
  apps/mobile ──writes──► user_presence (gated)
  apps/web ──reads──► viewer + social
```

---

## Verification commands

From repo root:

```bash
npm run test:shared
npm run build
cd apps/mobile && npx tsc --noEmit
npm run dev:mobile    # Expo Go
```

Boundary greps (source only):

```bash
rg "expo-location|user_presence" apps/mobile/app apps/mobile/src
rg "\.from\(" apps/mobile/app apps/mobile/src
```

---

## Git recovery commands

```bash
git log --oneline e066023..2efb525    # Phase 1
git show aac0193 --stat               # Phase 2B scaffold (if committed)
git diff HEAD -- apps/web/src packages/shared
```
