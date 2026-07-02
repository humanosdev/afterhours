# Intencity PWA → Native parity audit

**Purpose:** Inventory production **`apps/web` (PWA)** surfaces vs **`apps/mobile`**, classify gaps (UI, read-only data, interactions, realtime, map/presence, writes), and recommend ordered next phases — **without** changing product code.

**Audit date baseline:** Repo state when this document was authored.  
**Authority:** **`apps/web` is UX and behavioral source of truth**; native mirrors PWA incrementally ([NATIVE_ARCHITECTURE.md](./NATIVE_ARCHITECTURE.md)). **No parallel native redesign.**  
**Native migration ladder:** Phases **2A–2O** · **`VP-1` scaffold** ✅ · **`P2O-A` map engine** ✅ · **`VP-2` visual identity** **← next** · **`P2O-B` paused** until **`VP-2`** ([MIGRATION_PHASES.md](./MIGRATION_PHASES.md)).

**Doctrine (strict):** [Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine) — **parity = exact user-facing equivalence**, not rough similarity; **native upgrade = same product, better execution**, not redesign.

**Explicit audit scope:** **`VP-1` and `P2O-A` are not visual parity and not product parity.** They are route/engine scaffolds. Every PWA route, subroute, modal, sheet, swipe-up, overlay, state, and action stays **open** in [§11](#11-full-parity-backlog-master) until **Native-enhanced full parity**.

---

## Executive summary

- **Doctrine:** Native must eventually do **everything** the production PWA does, with the **same visual identity** and **equal-or-better** feel ([Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine)). **PWA is the blueprint; native is the better production implementation** — not a separate product.
- **Native today:** **`(tabs)`** + **`Stack`** shells mirror **IA**; most secondary surfaces are **`ParityPlaceholderScreen`** or **visually off-brand** vs deployed PWA — backlog flags **`Worse than PWA?`** where applicable.
- **`VP-1` / `P2O-A` (explicit):** **Scaffolded / engine-only** — **not** visual parity, **not** product parity. Do not mark backlog rows “done” based on these checkpoints alone.
- **Read plane (2O ladder):** Approved reads for `profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages` — **data ≠ surface parity**.
- **Largest gaps:** **Visual mismatch** across most screens (**`VP-2`** target), then writes, realtime, map overlays (heat, sheets, filters), GPS/`user_presence`, auth/onboarding completeness, notifications, settings subtree.
- **Gate order:** **`VP-2`** (visual identity) **→** **`P2O-B`** (location, **paused** until VP-2) **→** **`P2O-C`/`D`** (presence read/write, definitions unchanged) ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)).

---

## 1. PWA route inventory

Routes discovered under `apps/web/src/app/**/page.tsx` (path → page file).

| PWA route | Area | Typical role |
|-----------|------|----------------|
| `/` | Landing / marketing entry | Entry to app; often routes toward login or shell |
| `/login` | Auth | Email/social login (parity with native login scope differs) |
| `/signup` | Auth | Registration |
| `/forgot-password` | Auth | Password reset request |
| `/reset-password` | Auth | Password reset completion |
| `/onboarding` | Auth / profile bootstrap | Post-signup flows |
| `/onboarding/username` | Auth / profile bootstrap | Username selection |
| `/hub` | Core tab | Home feed — stories pulse, venues, shares, discovery entry |
| `/map` | Core tab | **Primary** Mapbox experience, GPS, heat, venues, overlays |
| `/stories` | Core “Create” surrogate | Moments / camera / story composer entry (BottomNav `/stories` or overlay) |
| `/shares/new` | Share flow | Venue/share creation |
| `/moments/[id]` | Story viewer | Full-screen moment/story playback |
| `/archive/hidden` | Stories | Hidden/archived moments |
| `/chat` | Core tab | Chat **list** |
| `/chat/[id]` | Messaging | Chat **thread**, send, realtime |
| `/profile` | Core tab | Own profile |
| `/profile/edit` | Profile | Edit avatar, bio, username, settings hooks |
| `/profile/friends` | Social | Friends list + actions |
| `/profile/blocks` | Safety | Blocks management |
| `/profile/[user_id]` | Social | Legacy/other profile by id |
| `/u/[username]` | Social | Public profile by handle |
| `/u/test` | Dev/test | Test harness (exclude from parity unless retained in prod) |
| `/search` | Discovery | Global / integrated search (web-shaped) |
| `/live-places` | Places | Venue discovery / pulse |
| `/venue-activity` | Places | Venue activity surface |
| `/notifications` | Activity | Notifications center |
| `/settings` | Settings | Account & app settings root |
| `/settings/notifications` | Settings | Notification prefs |
| `/settings/account/pause` | Settings | Account pause |
| `/settings/account/delete` | Settings | Account deletion |
| `/privacy`, `/terms`, `/guidelines` | Legal / trust | Static policy pages |

**Note:** Additional **client overlays** (story viewer modal, venue bottom sheets, map filters) may be implemented **inside** `map/page.tsx`, `hub/page.tsx`, `AppShell.tsx`, or shared components — not always separate routes; native must still match **user-visible capability**, not only URL count.

---

## 2–3. Native parity matrix

**Legend**

- **Nat. screen:** primary expo-router screen.
- **Visual % / Behavior %:** coarse engineering estimate (not user-tested).
- **Status column:** use the **nine-stage ladder** in [Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine) — includes **Visual mismatch** and **Native-enhanced full parity**.
- **Do not** treat **`VP-1` / `P2O-A` / `ParityPlaceholderScreen` as parity** regardless of matrix wording.

| PWA route / feature bundle | Native screen(s) | Data source today | Visual % | Behavior % | Status summary |
|---------------------------|------------------|-------------------|----------|------------|----------------|
| Landing `/` | `app/index.tsx` (redirect only) | None | — | ~20% | **Not implemented** — no marketing landing |
| Login | `(auth)/login.tsx` | Supabase Auth | ~62% | ~50% | **Improved VP-1** — copy points signup/forgot flows to deployed PWA (native remains email/password scope) |
| Signup | — | — | 0% | 0% | **Not implemented** — web/PWA |
| Forgot/reset password | — | — | 0% | 0% | **Not implemented** — web/PWA |
| Onboarding | — | — | 0% | 0% | **Not implemented** — users finish on web/PWA |
| Hub | `(app)/(tabs)/hub.tsx` | `friends`, `venues`, `shares` + **local** filter | ~68% | ~35% | **Visually tightened (`VP-1`)** · same data caveats (**no presence**, story ring stub) |
| Map | `(app)/(tabs)/map.tsx` | `venues` + **local** filter | ~48% | ~35% | **`P2O-A` Mapbox `MapView` (dev build)** + glass chrome + list · **Expo Go** decorative fallback · still **no** heat / GPS / `user_presence` |
| Stories / Moments center | `(app)/(tabs)/create.tsx` | None | ~58% | ~5% | **`VP-1` tab title “Moments”** + refreshed copy · **no composer** |
| Story viewer `/moments/[id]` | `(app)/moments/[id].tsx` | None scaffold | ~35% | 0% | **`VP-1` placeholder** ribbon — playback web-only |
| Shares new `/shares/new` | `(app)/shares/new.tsx` | None scaffold | ~35% | 0% | **`VP-1` placeholder** — writes web-only |
| Archive hidden `/archive/hidden` | `(app)/archive-hidden.tsx` | None scaffold | ~30% | 0% | **`VP-1` placeholder** |
| Chat list `/chat` | `(app)/(tabs)/chat.tsx` | `chats`, `messages`, `profiles` + **local** filter | ~70% | ~42% | **Row tap pushes `/chat/[id]` scaffold (`VP-1`)** · **no composer** · unread snapshot |
| Chat thread `/chat/[id]` | `(app)/chat/[id].tsx` | `chats`, `messages`, `profiles`, `blocks` (read) | ~72% | ~38% | **READ-SOCIAL-1** history + bubbles · send/realtime/seen deferred — [CHAT_THREAD_PARITY_AUDIT.md](./CHAT_THREAD_PARITY_AUDIT.md) |
| Profile `/profile` | `(app)/(tabs)/profile.tsx` | `profiles` (self), `friends` | ~65% | ~32% | **Overflow menu (`VP-1`)** · Friends count opens **`/friends`** roster · grids still shells |
| Profile edit `/profile/edit` | `(app)/profile-edit.tsx` | _(none)_ | ~35% | 0% | **`VP-1` placeholder** — writes/analytics deferred |
| Friends `/profile/friends` | `(app)/friends.tsx` | `friend_requests` + `blocks` + friend `profiles` (**2K**) | ~72% | ~25% | **Read-only roster** · actions + invites remain **web-only** |
| Blocks `/profile/blocks` | `(app)/blocks.tsx` | _(blocks rows only embedded in fetch)_ | ~35% | 0% | **`VP-1` placeholder** — moderation writes deferred |
| `/profile/[user_id]` | — | — | 0% | 0% | **Not routed** · **web-only** legacy path unless product revives handle-based URLs |
| Public `/u/[username]` | `(app)/u/[username].tsx` | _(none)_ | ~35% | 0% | **`VP-1` scaffold** — discovery/social graphs deferred |
| Search `/search` | **Integrated (2O)** + `(app)/search-discovery.tsx` | In-memory (+ stub) | ~45% | ~25% | **Global discovery parity stub** (**no networked search**) · embedded search unchanged |
| Live places `/live-places` | `(app)/live-places.tsx` + Hub rail (`venues`) | `venues` (partial rail) | ~38% | ~20% | **Placeholder route + partial data** vs web pulses |
| Venue activity `/venue-activity` | `(app)/venue-activity.tsx` | None | ~33% | 0% | **`VP-1` placeholder** |
| Venue popup / bottom sheet | `(app)/venue-detail.tsx` _(shell)_ | _(none)_ | ~33% | 0% | **`VP-1` shell** — geographic anchor exists (**`P2O-A`**); actionable sheet parity still backlog |
| Notifications `/notifications` | `(app)/notifications.tsx` | None | ~33% | 0% | **`VP-1` placeholder** — realtime/push deferred |
| Settings tree `/settings` | `(app)/settings.tsx` | None | ~33% | 0% | **`VP-1` placeholder** — nested prefs web-only |
| Legal `/privacy` `/terms` `/guidelines` | `(app)/privacy.tsx` `(app)/terms.tsx` `(app)/guidelines.tsx` | None | ~33% | 0% | **Copy scaffold** instructs canonical web/legal review · optional WebView later |

### VP-1 scaffold vs deepest product work (engineering truth)

Functional chat send, Moments playback, Blocks actions, networked search, settings mutations, pushes, realtime UI, GPS/heat, and **`user_presence`** **remain deliberately absent** despite new routes — ribbons label deferred phases (see **`ParityPlaceholderScreen`** + [MIGRATION_PHASES § Post-2O](./MIGRATION_PHASES.md#post-2o-roadmap-checkpoint)).

### Per-feature detail (condensed)

**Hub**

- **Has:** Top chrome, search field (functional local), Moments rail with **real** friend rings + placeholder “Your moment”, static Active friends card, Live places rail (`venues`), Shares cards (`stories` + owner headers), shared smoke line.
- **Missing UI:** Real story ring **capture** state, live presence subtitles, web-equivalent section actions, pull-to-refresh semantics parity.
- **Missing data:** `user_presence`, realtime story updates, likes/comments, notification badges.
- **Risks:** Users expect “what’s live” — copy mitigates but behavior gap remains until Post–2O + realtime policy.

**Map**

- **Has (`P2O-A`+):** Mapbox dark **`MapView`** (dev client) with **read-only** **`venues`** circles + labels + tap → glass preview card; filter chip **decoration**; scrollable venue list + **2O** filter; disclaimers. **Expo Go** shows the **static** canvas + list (**no** native Mapbox).
- **Missing:** User location puck, heat, friend dots, venue sheet parity, navigation to venue detail, web-equivalent functional filters.
- **Blocked / next:** **`P2O-B`**+ for GPS; heat/friends likely need **`P2O-C`** `user_presence` read + design.

**Create / Moments**

- **Has (`VP-1`):** Moments tab labeling + refreshed hero/subcopy; still **Phase 2H** centered icon treatment.
- **Missing:** Capture pipeline · upload · entitlement checks · venue share composer parity.

**Chat**

- **Has (READ-SOCIAL-1):** Preview list + **`/chat/[id]` read-only history** (PWA bubble layout, tap timestamps, block banner).
- **Missing:** Send, subscriptions, realtime, typing, seen writes, “delete for me”, authoritative unread sync.

**Profile**

- **Has (`VP-1`):** Avatar/display/bio/counts shells + **`⋯` overflow** mirroring secondary PWA entry points (**legal/settings/etc. placeholders**) · **Friends roster** (**`/friends`**) reachable from stats + menu.
- **Still missing product:** Editable grids, blocks tooling, `@username` public profile **behavior**, actionable share/edit affordances (`ParityPlaceholderScreen` warns).

**Auth**

- **Has:** Email/password path, branded shell, signup/forgot **copy** directs to deployed PWA.
- **Still missing UX parity:** Dedicated native signup/forgot onboarding flows (explicitly deferred).

---

## 4. Gaps by category

### A. Pure UI parity gaps

- Brand: PWA **IntencityBrandLockupImage** / lockup assets vs native generic headers.
- **Glass:** Web `ah-glass-control` vs native `GlassSurface` / `glass.ts` — blur strength, border tokens, radii.
- **Typography:** Web `globals.css` scale vs RN `Text` styles — weight/line-height/letter-spacing drift.
- **Density:** Hub rails, card padding, tab bar icon sizing vs web `BottomNav`.
- **Story rings:** Native `StoryRingPlaceholder` vs web real rings + progress.
- **Empty states:** Web likely richer illustrations/copy; native minimal.
- **Buttons:** Primary/secondary affordances vs web.

### B. Read-only data gaps

- **`user_presence`** (any read) — **forbidden** until **P2O-C** (named phase).
- **Notifications** table / feed reads — not on native.
- **Extended profile** fields / other tables web may read for settings, discovery — not audited table-by-table here; **gap:** any PWA read outside the **2N** set is **not** on native.
- **Chat thread messages** beyond list preview — not loaded on native.
- **Story/moment media metadata** beyond Hub share card subset — partial.

### C. Interaction / motion gaps

- Pull to refresh, haptics, shared element transitions, story scrubbing, map gestures — largely absent or simplified.

### D. Realtime gaps

- Chat message stream, typing, presence-driven UI, live story updates, notification toasts — **web only**.

### E. Map / GPS / presence gaps

- Entire interactive map, geolocation, heat, venue zone logic on device — **Post–2O** slices **P2O-A** through **D** per migration doc.

### F. Write / action gaps

- Post story, send chat, edit profile, friend request accept/decline, block/unblock, settings mutations, account pause/delete — **all web** today.

### G. Native-only platform gaps

- Push (APNs/FCM), deep links to `/u/`, background location — **future**; not required for parity audit closure but product may schedule.

---

## 5. Visual mismatch list (current)

| Element | PWA reference | Native observation |
|---------|---------------|-------------------|
| Logo / wordmark | `IntencityBrandLockupImage`, `/login` branding | Login/headers may lack same lockup fidelity |
| Background depth | `#0A0C18`, layered gradients on map/hub | `colors.bg*` aligned but map/hub atmospheric depth differs |
| Glass blur/borders | `ah-glass-control`, nuanced white/% borders | Frosted approximation; may differ blur |
| Typography | Fluid type scale / web fonts | System RN stack; sizing may differ |
| Spacing/density | Tailwind rhythm | `layout.ts` approximate |
| Bottom nav | 5 icons, center Plus → `/stories` (**Moments**) | **`VP-1` tab title + inactive tint tweak** · still non-pixel-perfect vs web blur |
| Search pills | Search integrated in multiple shells | Implemented as shared pill; placement may differ vs each web surface |
| Cards | Web card radius/shadow stacks | Shell cards + hub share cards — close but not identical |
| Story rings | Real thumbnails + gradients | Placeholder rings + real friend avatars mixed |
| Profile layout | Web profile grid/settings affordances | Simplified hero + shell tabs |
| Map styling | Mapbox rendered tiles (**`P2O-A`** dev build) · Expo Go fallback canvas | Heat / dusk parity / clustering still web-forward |
| Chat rows | Web list typography + unread | Functional parity direction; refinement needed |
| Empty states | Web-tuned microcopy/design | Functional short copy |
| Primary actions | Violet glow center button | Moments tab orb — similar intent (**`FloatingTabBar`**) |

---

## 6. Native routes still **product-incomplete** post–`VP-1` (checklist)

**`VP-1` added read-only shells**, but the following **remain non-production** on native (composer, writes, realtime, map engine, or networked discovery missing):

- **Auth:** signup/forgot/onboarding parity (still web-first).
- **Social/product writes:** Blocks actions, edit profile mutations, **`/shares/new` execution**, invite/accept/remove friends.
- **Media / viewer:** Moments playback, archive browsing, richer share/grid experiences.
- **Messaging:** Composer, subscriptions, authoritative unread (**beyond list snapshot**).
- **Discovery/search:** **`/search`** global/search API parity (stub route only alerts users).
- **Map-adjacent:** Live heat, overlays, clustering, actionable venue sheets (shell text only until **`P2O-A`**).
- **Feeds / infra:** Notifications center semantics, realtime toasts, push delivery.
- **Settings/legal:** Persisted prefs, account deletion/pause (**web-only workflows** today).
- **Marketing landing `/`**.

**Reads still gated outside approved ladder:** **`user_presence`**, **`notifications`** table payloads, miscellaneous discovery joins — enumerate per future phase + RLS audit.

---

## Recommended capability roadmap

Phases below are **grouped by capability** — **individual routes/overlays remain tracked** in **[§11](#11-full-parity-backlog-master)** until **Native-enhanced full parity**. **Hard gates:** **`VP-2` before `P2O-B`**; **no `expo-location` before `P2O-B`** (paused); **no `user_presence` read/write before `P2O-C`/`D`**; **no new `.from()`** without named audits; **no feature work disguised as VP-2** ([MIGRATION_PHASES.md](./MIGRATION_PHASES.md)).

**Guardrails**

- **`apps/web` remains source of truth** for UX and semantics.
- **No `user_presence`** read/write until **P2O-C / P2O-D** (or renamed equivalent) documented and approved ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)).
- **No presence window edits** in `packages/shared` without migration review.
- **One named phase per PR** + audits (`rg "\.from\("`, `tsc`, `test:shared`).

### Proposed phases (strict order)

| Order | Phase name | Scope | Allowed deps / tables | Forbidden | Reason |
|------|------------|--------|----------------------|-----------|--------|
| **0** | **`VP-1` — Route / IA scaffold** ✅ | Tabs under **`Stack`**, `ParityPlaceholderScreen`, Moments label · **not visual/product parity** | Matches **2O** approvals | Writes, realtime, GPS, **`user_presence`** | Waypoint only |
| **0b** | **P2O-A — Mapbox engine + read-only venues** ✅ | `@rnmapbox/maps`, catalog pins · **not web map UX parity** | Existing **`venues`** reads | GPS, heat, sheets, `user_presence` | Engine validation only |
| **1** | **`VP-2` — Exact PWA visual identity pass** | **← NEXT** — side-by-side vs **deployed PWA** on every existing screen | **No new deps / no `.from()` / no writes** | Location, presence, realtime, camera | Stop looking like a separate product |
| **2** | **P2O-B — Foreground location UX** | **PAUSED** until **VP-2** | `expo-location` | Presence **writes**, background tracking | Resume after visual sign-off |
| **3** | **READ-SOCIAL-1 — Read-only parity pages (batchable)** | e.g. **Chat thread read-only** (messages for one `chat_id`), **Friends** list screen (reuse `profiles` graph), **`/u/[username]` read-only** if spec’d | Extend `.from()` only per **named** sub-phase audit | Sends, friend actions | Unlocks parity **without** realtime/writes |
| **4** | **P2O-C — `user_presence` read-only** | Poll or subscribe read; map/hub **display** dots | **`user_presence`** read only | Writes | Requires RLS/security review |
| **5** | **REALTIME-1 — Chat realtime (optional ordering)** | Subscriptions for thread/list freshness | Realtime infra | Presence writes | Product chooses if thread read-only shipped first vs realtime |
| **6** | **P2O-D — Gated presence writes** | Mobile upsert path + web writer retirement rules per cohort | `expo-location` + orchestration mirroring web | Ungated prod rollout | Requires **PRESENCE_OWNERSHIP** gates |

**Chat ordering note:** **Read-only thread** (**READ-SOCIAL-1**) is **recommended before** full realtime chat — simpler RLS Story, deterministic QA, aligns with migration discipline. Realtime can follow as **REALTIME-1**.

**Visual parity:** **`VP-1` / `P2O-A` did not achieve visual parity.** **`VP-2`** is mandatory before **`P2O-B`** or broad feature expansion.

---

## 9. Confirmations

| Statement | Verified for this audit |
|-----------|---------------------------|
| `apps/web` remains source of truth | ✅ Documented policy |
| Native must mirror PWA (**eventually full equivalency**) | ✅ [Doctrine](./MIGRATION_PHASES.md#native-full-parity-doctrine); **`VP-1` placeholders are staged scaffolds only** |
| No random native redesign | ✅ **Shell + `VP-1` placeholders** labeled; IA follows web BottomNav |
| No presence window edits | ✅ Not part of roadmap until explicit shared change |
| No `user_presence` until gated phase | ✅ **P2O-C/D** only |

---

## 10. VP-1 deferral ledger (engineering)

Concise **engineering hints** · **per-route status, blockers, deps, and risks** live in **[§11 Full parity backlog](#11-full-parity-backlog-master)** (do not let §10 replace that table).

| Capability | Native VP-1 state | Safest next phase / note |
|------------|-------------------|---------------------------|
| **Chat thread UX** (`/chat/[id]`) | Copy-only scaffold | **READ-SOCIAL-1** (read-only histories) → **REALTIME-1** (composer + subs) |
| **Moments viewer** (`/moments/[id]`) | Scaffold | Media pipeline + entitlements phase (often post **P2O-A** map confidence) |
| **Public profile** (`/u/[username]`) | Scaffold | Dedicated read APIs + moderation hooks before grids/follow UX |
| **Blocks / friend writes** | Scaffolds + web-required actions | Gated writes + tooling slice (paired with QA/moderation) |
| **`/shares/new` execution** | Scaffold | Camera/upload/write phase after composer spec |
| **Global `/search`** | `/search-discovery` stub | Backend/search parity phase (distinct from **2O** local filter) |
| **Venue sheets / overlays** (`/venue-detail`, map chrome) | Scaffolds | **`P2O-A`** for geographic truth → layered UX |
| **Live heat / friend dots / filters** | Web-only richness | **`P2O-A`** primitives → **`user_presence` read** (**P2O-C**) for pulses |
| **Notifications / push** | Scaffold | Infrastructure + realtime policy (likely after thread roadmap) |
| **Settings/account/legal in-app fidelity** | Scaffolds / web canonical | Pref WebView/export once copy + liability sign-off |
| **Onboarding / signup / forgot native** | Web-first | Product decision — only if mobile acquisition requires |
| **Landing `/` marketing** | Missing | Out of auth-shell scope |

---

## 11. Full parity backlog (master)

Canonical doctrine: [Native Product Equivalence Doctrine](./MIGRATION_PHASES.md#native-product-equivalence-doctrine). **Parity = exact user-facing equivalence.** Track **routes and in-page overlays** (modals, sheets, swipe-ups) until **Native-enhanced full parity**.

### Backlog column definitions

| Column | Meaning |
|--------|---------|
| **Stage** | Ladder: Missing → Scaffolded → Visual mismatch → Visual parity → Read → Interaction → Write/action → Realtime → Native-enhanced full parity |
| **Visual status** | Brand/layout match vs **deployed PWA** (independent of data) |
| **Behavior status** | User can perform PWA-equivalent actions/states on native |
| **Required reads** | Supabase/API reads needed for parity (approved phases only until expanded) |
| **Required writes** | Mutations needed |
| **Realtime** | Live transport needed (Y/—) |
| **Native platform** | Push, camera, deep link, etc. (Y/—) |
| **Blocker** | Current gate preventing promotion |
| **Worse than PWA?** | **Y** if native is visibly off-brand or degraded today |
| **Redesign fix?** | **Y** if native diverged from PWA identity and needs correction (**VP-2**) |
| **Native upgrade** | Deliberate native-quality win once at parity (perf, transitions, haptics) |

**Legacy cols Wr / Rt / Loc / Cam / Pu:** shorthand for ultimate capability needs (**≠** one PR).

| PWA surface | Native route | Stage | Visual status | Behavior status | Required reads | Required writes | RT | Plat | Blocker | Worse? | Redesign? | Native upgrade | Next phase | Risk |
|-------------|--------------|-------|---------------|-----------------|----------------|-----------------|:--:|:--:|---------|:------:|:---------:|----------------|------------|:----:|
| **`/` landing** | `LandingScreen` @ `/` | Partial parity | Marketing shell | CTAs route auth | — | — | — | — | Signup/reset wiring | — | — | Full auth parity | Auth slice | Med |
| **Splash / boot** | Expo splash + `AppLoadingScreen` | Partial parity | Branded lockup | Boot only | — | — | — | Y | Prebuild for assets | — | Y | Native splash timing | **VP-2** | Low |
| **Session loading** | `app/index.tsx` | Partial parity | Branded gate | Gate only | — | — | — | — | Motion polish | — | Y | Faster cold start | **VP-2** | Low |
| **`/login`** | `(auth)/login.tsx` | Partial parity | PWA-aligned shell | Email login only | Auth | signup OAuth | — | — | Signup/reset native | — | Y | Native keyboard/safe-area | Auth slice | Low |
| **`/signup`** | `(auth)/signup.tsx` | Partial parity | Shell only | Disabled fields | Auth | registration | — | — | Auth wiring | — | — | Native signup | Auth slice | Med |
| **`/forgot-password`** | `(auth)/forgot-password.tsx` | Partial parity | Shell only | UI only | Auth | reset | — | — | Email send wiring | — | — | Deeplink recovery | Auth slice | Med |
| **`/reset-password`** | `(auth)/reset-password.tsx` | Partial parity | Shell only | UI only | Auth | reset | — | — | Token deep link | — | — | Token deep link | Auth slice | Med |
| **`/onboarding`** | `(auth)/onboarding.tsx` | Partial parity | Step shell | Skip only | profiles | onboarding writes | — | — | Branching UX | — | — | Branching UX | Onboarding | Med |
| **`/hub`** | `(tabs)/hub.tsx` | Partial parity | Rails/cards closer | Partial lists | profiles, venues, stories, friends | shares, reactions | Y | — | Stories/presence data | — | Y | Snappier rails | **VP-2** / reads | High |
| **`/map` + base GL** | `(tabs)/map.tsx` | Partial parity | Immersive chrome | Pan/zoom + sheet scaffold | venues | filters, sheets | — | Y | Heat/friends/GPS | — | Y | Map gestures | **P2O-B**+ | High |
| **Map heat / filters / friend dots** | map chrome | Missing | — | Web-only | user_presence, venues | — | Y | Y | **P2O-C**+ | — | — | Native pulse render | **P2O-C** | High |
| **`/stories` / Moments tab** | `(tabs)/create.tsx` | Visual mismatch | Tab label only | No composer | stories (read) | capture, upload | — | Y | **VP-2** + camera phase | Y | Y | Native capture UX | **VP-2** then media | High |
| **`/moments/[id]`** | `moments/[id].tsx` | Scaffolded | Placeholder | Ribbon only | stories, media | — | Y | — | **VP-2** shell | Y | Y | Full-screen player | Media slice | High |
| **`/shares/new`** | `shares/new.tsx` | Scaffolded | Placeholder | Ribbon only | venues, stories | share create | — | Y | Write phase | Y | Y | Native composer | Write slice | High |
| **`/archive/hidden`** | `archive-hidden.tsx` | Scaffolded | Placeholder | Ribbon only | stories | visibility | — | — | Read spec | Y | Y | Native grid | Stories read | Med |
| **`/chat` list** | `(tabs)/chat.tsx` | Partial parity | Messages header/rows | Previews only | chats, messages, profiles | send | Y | — | Realtime + New | — | Y | List perf | READ-SOCIAL-1 | Med |
| **`/chat/[id]`** | `chat/[id].tsx` | Partial parity | Thread + history | READ-SOCIAL-1 shipped | messages, profiles, chats, blocks | send, seen, RT | Y | — | Composer + subs | — | Y | REALTIME-1 | READ-SOCIAL-1 ✅ / REALTIME-1 | High |
| **`/profile`** | `(tabs)/profile.tsx` | Partial parity | PWA grid layout shell | Read partial | profiles, friends | edit, grids | — | — | Grid media data | — | Y | Profile transitions | **VP-2** / reads | Med |
| **`/profile/edit`** | `profile-edit.tsx` | Scaffolded | Placeholder | Ribbon only | profiles | avatar, fields | — | Y | Write phase | Y | Y | Native image picker | Write slice | High |
| **`/profile/friends`** | `friends.tsx` | Visual mismatch | Roster plain | Read-only list | friend_requests, blocks, profiles | accept/decline | — | — | **VP-2** | Y | Y | Native list actions | **VP-2** then writes | Med |
| **`/profile/blocks`** | `blocks.tsx` | Scaffolded | Placeholder | Ribbon only | blocks | block/unblock | — | — | Write phase | Y | Y | Safety UX | Moderation | Med |
| **`/profile/[user_id]`** | — | Missing | — | Legacy web | profiles | — | — | — | Path decision | — | — | — | TBD | Low |
| **`/u/[username]`** | `u/[username].tsx` | Scaffolded | Placeholder | Ribbon only | profiles (+ social) | follow, etc. | Y | — | Read spec | Y | Y | Public profile UX | READ-SOCIAL | High |
| **`/search` global** | `search-discovery.tsx` | Partial parity | Discovery UI | FoF + pills; no live trending | profiles, friend_requests, blocks, venues preview | send from search | Y | — | Presence trending | — | Y | Live venue rank | READ-SOCIAL-2 | Med |
| **`/profile/friends`** | `friends.tsx` | Partial parity | Roster + search | No active/presence; no accept | friend_requests, profiles, blocks | accept/decline | — | — | Request actions | Y | Y | Active friends | READ-SOCIAL-2 | Med |
| **Integrated search (2O)** | Hub/Chat/Map | Read parity | Field styling off | Local filter | in-memory loaded rows | — | — | — | **VP-2** fields | Y | Y | Debounced UX | **VP-2** | Low |
| **`/live-places`** | `live-places.tsx` + Hub rail | Visual mismatch | Placeholder + rail | Partial venues | venues, presence | — | Y | Y | **VP-2** + **P2O-C** | Y | Y | Pulse list | **P2O-C** | High |
| **`/venue-activity`** | `venue-activity.tsx` | Scaffolded | Placeholder | Ribbon only | venues, activity | — | Y | — | Read spec | Y | Y | Activity feed | Reads slice | Med |
| **Venue sheet / popups** | `venue-detail.tsx` + map peek | Scaffolded | Peek only | Tap card | venues | — | — | — | Sheet UX | Y | Y | Native bottom sheet | Post-**VP-2** | Med |
| **`/notifications`** | `notifications.tsx` | Scaffolded | Placeholder | Ribbon only | notifications | mark read | Y | Y | Infra + reads | Y | Y | Push inbox | REALTIME+Pu | High |
| **`/settings`** subtree | `settings.tsx` (+ gaps) | Scaffolded | Placeholder | Ribbon only | profiles, prefs | account actions | — | — | Full tree spec | Y | Y | Native settings nav | Settings writes | Med |
| **Account pause / delete** | — | Missing | — | Web-only | profiles | account lifecycle | — | — | Legal | — | — | Risk flows | Account | High |
| **`/privacy` `/terms` `/guidelines`** | legal scaffolds | Scaffolded | Copy shell | Static read | — | — | — | — | **VP-2** typography | Y | Y | In-app WebView option | **VP-2** | Low |
| **New `apps/web` routes** | — | Missing | — | — | TBD | TBD | TBD | TBD | Inventory drift | — | — | — | Process | Med |

---

## 12. VP-2 residual parity matrix (side-by-side audit)

**Audit date:** post **VP-2A** (brand/shell) + **VP-2B** (screen architecture). **Method:** code comparison of deployed PWA (`apps/web`) vs `apps/mobile` — not pixel-diff screenshots.

### Classification legend

| Category | Meaning |
|----------|---------|
| **VISUAL ONLY** | Fixable now with layout/assets/tokens/copy — no new backend |
| **LOGIC DEPENDENT** | Needs reads/writes/realtime/state machine — looks wrong until wired |
| **API / ASSET DEPENDENT** | Needs Supabase tables/RPCs, Storage URLs, or bundled assets web already has |
| **PLATFORM LIMITATION** | Expo Go vs dev client, RN vs DOM, Ionicons vs Lucide, etc. |
| **NOT YET IMPLEMENTED** | Feature intentionally absent on native |

**Blocks true parity?** — **Y** if users cannot recognize surface as same product without it; **N** if cosmetic or deferred feature.

### Surface-by-surface matrix

| Surface / component | Native status | Expected PWA behavior | Why it differs | Category | Fix phase | Blocks? |
|---------------------|---------------|----------------------|----------------|----------|-----------|---------|
| **Global tokens / glass** | Close | Charcoal + blue glass | VP-2A aligned | VISUAL ONLY | **VP-2** polish | N |
| **Bottom nav** | Close | 5-tab glass bar, center create | Ionicons ≠ Lucide shapes | VISUAL ONLY | **VP-2** icons | N |
| **Landing `/`** | Partial | `HomeLanding` marketing | Auth CTAs wired; no motion | VISUAL ONLY | **VP-2** motion | N |
| **Splash / boot** | Partial | Lockup + `#0A0C18` | Needs prebuild for device assets | API / ASSET | Rebuild | N |
| **Login** | Partial | Lockup + white CTA + links | Signup/OAuth/legal flows partial | LOGIC DEPENDENT + VISUAL | Auth slice | N |
| **Signup / forgot / reset** | Shell only | Full Supabase auth | Fields disabled | NOT YET IMPLEMENTED | Auth slice | N |
| **Onboarding** | Shell only | Profile branch + writes | Skip → hub only | NOT YET IMPLEMENTED | Onboarding | Y |
| **Hub — search pill** | Close | 50px glass pill | Functional local filter | — | — | N |
| **Hub — Moments rail** | Partial | Story groups + viewer | Friends shown, not story groups; no `story_views` | LOGIC DEPENDENT | Stories read + RT | Y |
| **Hub — story unseen rings** | Fixed (VP-2 pass) | `ringActive` from views | Was faked `i%3` | was LOGIC DEPENDENT | Stories | Y |
| **Hub — Active friends** | Empty always | Live friends from `user_presence` | No presence read | LOGIC DEPENDENT | **P2O-C** | Y |
| **Hub — Live Places cards** | Partial | Venue photos + live counts | Names/categories only; no `image_url` in preview fetch | API / ASSET + LOGIC | Venues enrich + **P2O-C** | Y |
| **Hub — Shares feed** | Partial | Likes/comments + realtime | Real images; no `story_likes`/`story_comments` | LOGIC DEPENDENT | Social reads | Y |
| **Map — full bleed** | Close | Viewport map | VP-2B immersive | — | — | N |
| **Map — Mapbox engine** | Conditional | GL map + token | Expo Go → fallback; needs dev build + `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | PLATFORM + API | Config + rebuild | Y |
| **Map — heat layer** | Missing | `venue-heat` GeoJSON | No `user_presence` / activity aggregation | LOGIC DEPENDENT | **P2O-C**+ | Y |
| **Map — GPS puck / follow** | Missing | `watchPosition` + writes | No `expo-location` | NOT YET IMPLEMENTED | **P2O-B** | Y |
| **Map — filter chips** | Honest preview | Filter venue set | Visual only; labeled | was misleading → fixed | Filter logic | N |
| **Map — venue sheet** | Scaffold | 74svh sheet + hero + density | Skeleton hero; no swiper | LOGIC DEPENDENT | Map UX slice | Y |
| **Map — checkpoint swiper** | Disabled nav | Prev/next venue on map | No selection carousel | LOGIC DEPENDENT | Map UX | Y |
| **Chat list** | Partial | Sticky header + rows | Real previews; New disabled | LOGIC DEPENDENT | Chat create | N |
| **Chat thread** | READ-SOCIAL-1 | Real messages + send | History read-only; send disabled honestly | READ-SOCIAL-1 ✅ / REALTIME-1 | Y |
| **Profile layout** | Partial | Left avatar + stats grid | Grid empty; stats `—` | LOGIC DEPENDENT | Profile grids | Y |
| **Profile avatar fallback** | Fixed (VP-2 pass) | Blue gradient + silhouette | Was initials | was VISUAL ONLY | — | N |
| **Profile Edit/Share** | Disabled | Working on web | Writes + picker | NOT YET IMPLEMENTED | Write slice | N |
| **Moments tab** | Shell | Camera + composer | Static rows | NOT YET IMPLEMENTED | Camera slice | Y |
| **Stack placeholders** | Product shell | Full pages | Preview rows only | NOT YET IMPLEMENTED | Per-route | varies |
| **Push / VAPID** | Missing | Web push | No native push stack | NOT YET IMPLEMENTED | Push infra | N |
| **Realtime (hub/map/chat)** | Missing | Supabase channels | No subscriptions | LOGIC DEPENDENT | REALTIME slice | Y |

### Logic vs visual — explicit confirmation

| Symptom | Looks wrong because… | Should fix in VP-2 visual pass? |
|---------|----------------------|--------------------------------|
| Venue swiper / map camera sync | **Logic** — no selection state machine | **No** |
| Presence-driven density / heat | **Logic** — no `user_presence` read | **No** |
| Story unseen / active rings | **Logic** — no `story_views` | **No** (do not fake) |
| Friend ordering in Moments | **Logic** — friends ≠ story owners ordering | **No** |
| Delayed avatar hydration | **API** — URL loads async; fallback now matches PWA | **Yes** (fallback only) |
| Share like/comment counts | **Logic** — no interaction reads | **No** (removed fake counts) |
| Chat composer / bubbles | **Logic** — no message load/send | **No** (empty state, not fake thread) |
| Profile grids / archive | **Logic** — no grid queries | **No** |
| Map filter chips doing nothing | Was **misleading** | **Yes** — label as preview |
| Fake chat messages | Was **misleading** | **Yes** — removed |
| Wrong avatar initials | Was **visual** | **Yes** — fixed |
| Ionicons vs Lucide | **Visual** | **Yes** (ongoing) |
| Missing venue photos on Hub | **API** — preview query may omit `image_url` | Partial visual if URL available |

---

## 13. Native dependency audit (web vs mobile)

### Environment variables

| Key / service | Web | Native | Parity required? | Notes |
|---------------|-----|--------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `EXPO_PUBLIC_SUPABASE_URL` | **Required** | Same project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Same anon key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | **Required** for native map | **Different env name** — copy `pk.*` manually |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ server | ❌ | **Forbidden** on mobile | Never ship in app |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | ❌ | Optional until push | Web push only |
| `VAPID_PRIVATE_KEY` | ✅ server | ❌ | N/A on device | |
| `RESEND_API_KEY` | ✅ server | ❌ | Optional | Feedback API route only |
| `MAPBOX_DOWNLOADS_TOKEN` / Maven | RN build | ⚠️ dev build | **Required** for Android/iOS native SDK download | See `apps/mobile/README.md` |

### External services & integrations

| Service | Web usage | Native today | Parity depends? |
|---------|-----------|--------------|-----------------|
| **Supabase Auth** | Full | Login only | **Required** |
| **Supabase Postgres** | Full | Read-only approved tables | **Required** |
| **Supabase Realtime** | Hub/Map/Chat | ❌ | **Required** for live parity later |
| **Supabase Storage** (`avatars`, `stories`) | Upload + CDN URLs | Read URLs only | **Required** for images (reads OK) |
| **Mapbox GL / RN Maps** | `mapbox-gl` | `@rnmapbox/maps` | **Required** for map tab (engine differs) |
| **Web Push + VAPID** | PWA install | ❌ | Optional v1 |
| **Resend** | Feedback email | ❌ | Optional |
| **Legal consent API** | `/api/legal/consent` on signup | ❌ | **Required** for signup parity later |

### Bundled assets

| Asset | Web (`public/`) | Native (`assets/`) | Status |
|-------|-----------------|-------------------|--------|
| `intencity-splash-lockup.png` | ✅ | ✅ `splash-lockup.png` | Copied |
| `hub-logo.png` | ✅ | ✅ | Copied |
| `icon-512` / store icons | ✅ | ✅ `icon.png` | Copied from 512 |
| Letter logos | ✅ | ❌ | **VISUAL ONLY** if needed on native |
| Custom fonts | ❌ (system) | ❌ (system) | **No gap** |

### Supabase reads native does NOT yet use (PWA uses)

| Table / RPC | PWA use | Native | Blocks parity? |
|-------------|---------|--------|----------------|
| `story_views` | Unseen rings | ❌ | Hub Moments **Y** |
| `story_likes` / `story_comments` | Share engagement | ❌ | Shares **Y** |
| `user_presence` | Hub/Map/Live | ❌ | Presence surfaces **Y** |
| `notifications` | Hub badge, chat unread | ❌ | Notifications **Y** |
| `get_profile_for_viewer` RPC | Public profile | ❌ | `/u/[username]` **Y** |
| Venue `image_url` fields | Live place photos | Partial in `venues` select | Hub cards **partial** |

**Native approved reads (unchanged):** `profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages`.

---

## 14. Misleading UI policy (native)

Native must **not** imply working features. Fixed in this pass:

- Removed **fake chat thread bubbles** → honest empty state (`ChatThreadShell`).
- Removed **fake unseen story rings** on Hub.
- Removed **fake share like/comment counts**.
- Map filters labeled **visual only**.
- Venue sheet density strip → copy instead of fake numbers.

Still potentially misleading (acceptable until logic ships):

- **Active friends** always empty (copy explains; not fake data).
- **Disabled** Edit profile / Share / New message (reduced opacity).
- **Placeholder list rows** on stack routes (no fake DB data).
- **Map checkpoint** prev/next disabled (no fake navigation).

---

## 15. VP-2 final atmospheric audit (9-category breakdown)

**Method:** Side-by-side code audit of deployed PWA (`apps/web`) vs `apps/mobile` after **`VP-2` implementation** (blur, gradients, glass depth, rings, map/hub/nav). **Not** pixel-diff screenshots.

### Category 1 — Pure visual mismatches (addressed in VP-2)

| Item | PWA | Native (after VP-2) | Status |
|------|-----|---------------------|--------|
| Glass blur strength | `backdrop-filter: blur(24px)` | `expo-blur` in `GlassSurface` | **Improved** |
| Glass shadow depth | `0 8px 32px` @ 45% | `shadowRadius: 32` | **Improved** |
| Avatar fallback gradient | 3-stop blue | `expo-linear-gradient` in `ProfileAvatar` | **Fixed** |
| Story ring gradient/glow | `StoryRing` + `Avatar` | `StoryRing` component | **Fixed** |
| Hub section rhythm | `mt-14` major breaks | `majorDivider` 36px top | **Improved** |
| Venue card footer | Heat gradient stack | `LinearGradient` footer | **Improved** |
| Chat header/list frost | `bg-primary/92` + blur | `GlassSurface` header + list | **Improved** |
| Landing ambient motion | `.ah-landing-float-slow` | Reanimated glow drift | **Improved** |
| Lucide vs Ionicons shapes | Lucide strokes | `lucide-react-native` on tab bar | **Fixed** |
| Legal pages copy/layout | Full sections | `LegalDocumentScreen` + root `/privacy` `/terms` `/guidelines` | **Fixed** |
| Landing motion | Float + reveal | Glow drift + staggered feature rows | **Fixed** |
| Story ring inner border | `border-primary` 2.5px | `photoFrame` on `StoryRing` | **Fixed** |

### Category 2 — Atmospheric mismatches

| Item | Gap | VP-2 action | Future phase |
|------|-----|-------------|--------------|
| Hub depth / edge lighting | Web layered glow on rails | Hub top glow + glass cards | Motion polish optional |
| Map dusk / day tile style | Clock-driven light/dark | Dark Mapbox only | Map day-mode logic |
| Global content reveal | `.ah-content-reveal` | Not yet on native lists | Interaction slice |
| Pull-to-refresh chrome | Web shell | Absent | Interaction slice |

### Category 3 — Motion / interaction mismatches

| Item | PWA | Native | Fix phase |
|------|-----|--------|-----------|
| Tab press scale | `active:scale-[0.98]` create | Create orb scale | **VP-2** partial |
| Venue sheet drag dismiss | 52px threshold | Tap backdrop only | Map UX slice |
| Story viewer scrub | Full-screen | Scaffold | Media slice |
| Landing card hover lift | CSS hover | N/A mobile | — |

### Category 4 — Glass / translucency mismatches

| Surface | Before VP-2 | After VP-2 |
|---------|-------------|------------|
| Bottom nav | Tint panel | Blur + tint + sheen |
| Map filter tray | Tint | `intense` blur |
| Map checkpoint | Tint | `intense` blur |
| Venue sheet | Tint | `intense` blur + gradient fill |
| Hub search / active friends | Solid secondary | Glass |

**Note:** Expo Go may show tint-only fallback; **dev client** required for full frost (same as Mapbox).

> **§15 status:** Engineering checkpoint only — **not** VP-2 sign-off. See **[§16 Strict verification](#16-vp-2-strict-verification-pass-pre-signoff)** (2026-05).

### Category 5 — Map immersion mismatches

| Item | Status | Depends on |
|------|--------|------------|
| Full-bleed map | **Close** | — |
| Heat GeoJSON layer | Missing | **P2O-C**+ |
| GPS puck / follow | Missing | **P2O-B** |
| Friend dots panel | Missing | **P2O-C** |
| Venue sheet hide nav | **Improved** (`tabBarStyle` + backdrop) | — |
| Checkpoint swiper | Disabled (honest) | Map selection logic |
| Filter semantics | Labeled preview | Presence + filter logic |

### Category 6 — Navigation parity mismatches

| Item | PWA | Native VP-2 |
|------|-----|-------------|
| 5-tab glass bar | `ah-glass-control` | `GlassSurface` + blur |
| Center create glow | Violet shadow | Matched |
| Profile tab avatar | Live `avatar_url` | `useMyProfile` in tab bar |
| Chat unread badge | Count bubble | **Placeholder** — REALTIME-1 |
| Hide nav on venue sheet | Yes | `tabBarStyle` when sheet open |

### Category 7 — Component fidelity mismatches

| Component | VP-2 state |
|-----------|------------|
| `StoryRing` | PWA gradient rings; `ringState` hook for future `story_views` |
| `ProfileAvatar` | Gradient fallback + optional active ring |
| `VenueChipPlaceholder` | Images from `venues` columns; honest “LIVE ACTIVITY” pill |
| `MapVenueSheet` | Hero image when URL present; density placeholder |
| `HubSharePreviewCard` | No fake engagement rows (VP-2C) |

### Category 8 — Typography / density mismatches

| Item | Status |
|------|--------|
| Section titles 15px semibold | Aligned via `SectionHeader` |
| Hub rail 84px columns | Aligned |
| Search 50px pill | Aligned |
| System font vs web | **Platform** — acceptable |

### Category 9 — Overlay / sheet choreography mismatches

| Overlay | PWA | Native |
|---------|-----|--------|
| Map venue sheet 74svh | Yes | `maxHeight: 74%` |
| Sheet backdrop dim | Yes | `rgba(0,0,0,0.42)` press dismiss |
| Share comments sheet | 80dvh slide | Not implemented |
| Story viewer modal | Full-screen | Scaffold |

### Future semantic dependency map (do not fake)

| Visual semantic | UI hook today | Data / phase |
|-----------------|---------------|--------------|
| Story unseen glow | `StoryRing` `ringState="unseen"` | `story_views` read |
| Story seen / muted | `defaultFriendStoryRingState()` → `"seen"` | Current honest default |
| Own moment active ring | `variant="add"` | Stories ownership + capture |
| Venue heat colors | `VenueHeatVisualState` | `user_presence` **P2O-C**+ |
| Live activity counts | “LIVE ACTIVITY” pill copy | **P2O-C** |
| Active friends rail | Empty glass card | `user_presence` **P2O-C** |
| Map filter chips | Visual preview label | Filter logic + presence |
| Chat unread badge | (none yet) | `notifications` + REALTIME-1 |
| Profile stats `—` | Empty copy | Grid/stats reads |
| Ghost mode affordance | Not shown | Settings + presence writes |

Types: `apps/mobile/src/theme/paritySemantics.ts`.

---

## 16. VP-2 strict verification pass (pre-signoff)

**Date:** strict audit before **P2O-B**.  
**Baseline:** Production PWA at [https://getintencity.com](https://getintencity.com) (landing verified live) + **authenticated** surfaces compared via **`apps/web` source of truth** (hub/map/chat require signed-in session — pixel QA on device still required).  
**Verdict:** **VP-2 is NOT complete.** Another **visual-only** pass (**VP-2D**) is required before **P2O-B**.

### Truth-category legend

| Category | Meaning |
|----------|---------|
| **PARITY-COMPLETE** | Visual/chrome matches PWA intent for VP-2 scope |
| **VISUALLY-WRONG** | Fixable now without new backend (layout, glass, tokens, motion) |
| **BLOCKED-LOGIC** | Needs reads/writes/realtime/state machine |
| **BLOCKED-NATIVE-API** | Needs platform module / dev build / config (Mapbox, blur, camera, push) |
| **INTENTIONALLY-DEFERRED** | Named later phase; honest placeholder OK |
| **NOT-IMPLEMENTED** | Surface or affordance absent |

---

### 1. Hub parity (strict)

| Check | PWA (`/hub`) | Native | Category | Notes |
|-------|--------------|--------|----------|-------|
| Top safe-area spacing | `pt-[calc(safe-area+12px)]` | `screenPaddingTop: 12` + SafeAreaView | **VISUALLY-WRONG** | Close; verify on notched devices |
| Logo / slogan chrome | 36px logo, 12px slogan | 36px logo, 12px slogan | **PARITY-COMPLETE** | |
| Notification heart | `ah-glass-control` **button** → `/notifications` + unread badge | Glass circle, **not pressable**, no badge | **VISUALLY-WRONG** + **NOT-IMPLEMENTED** | Badge = **BLOCKED-LOGIC** (`notifications`) |
| Search bar | Full-width glass pill, 50px, icon, `ah-glass-control-interactive` | `GlassSurface` pill + inner field | **VISUALLY-WRONG** | See §16 glass — heavy tint masks blur |
| Moments rail gap/size | `gap-[14px]`, `w-[84px]`, `storyLg` | `hubRailGap: 14`, `84px` column | **PARITY-COMPLETE** | |
| Story ring glow | Dynamic `active` from `story_views` | Gradient rings; friends **muted** (`seen`) | **PARITY-COMPLETE** (chrome) · **BLOCKED-LOGIC** (unseen) | Honest defaults in `paritySemantics.ts` |
| Your moment + badge | StoryRing + conditional `+` | `StoryRing` `variant="add"` | **PARITY-COMPLETE** | |
| Active friends empty | Plain `py-5` text, no card | Text inside **glass card** | **VISUALLY-WRONG** | Native **more** chrome than PWA |
| Active friends action | `ah-glass-control` pill “Open friends” | `SectionHeader` pill **solid** tint, not glass | **VISUALLY-WRONG** | |
| Live Places card size | `w-[min(72vw,15.5rem)]`, `aspect-[5/6]` | `min(72vw, 248)`, `5/6` | **PARITY-COMPLETE** | |
| Live Places heat glow | Dynamic `boxShadow` from activity | Static card; no heat-colored glow | **BLOCKED-LOGIC** | Honest “LIVE ACTIVITY” label OK |
| Live Places activity count | Real `v.total` in pill | No numeric count | **BLOCKED-LOGIC** | Correct not to fake |
| Section dividers | `h-px bg-white/[0.08]`, `mt-14` before Live Places | `majorDivider` 36px + `0.08` opacity | **VISUALLY-WRONG** | `mt-14` = 56px — native ~36px |
| Shares feed chrome | Full cards + engagement | Images OK; no likes/comments | **BLOCKED-LOGIC** | |
| Feed reveal motion | `ah-content-reveal` + swiper gate | Skeletons only | **VISUALLY-WRONG** / deferred motion | |
| Bottom nav frost | `ah-glass-control` blur | `GlassSurface` + **72% tint overlay** | **VISUALLY-WRONG** | See glass system |
| Profile tab avatar | Avatar + active ring | Avatar + ring | **PARITY-COMPLETE** | |
| Create glow | `shadow-[0_0_22px_rgba(122,60,255,0.48)]` | Matched | **PARITY-COMPLETE** | |
| Overall darkness | `#0A0C18` canvas | `#0a0c18` | **PARITY-COMPLETE** | Contrast feels flat due to glass |

---

### 2. Map parity (strict)

| Check | PWA (`/map`) | Native | Category | Notes |
|-------|--------------|--------|----------|-------|
| Default zoom / camera | Initial **zoom 14**, GPS center, flyTo | Fit-bounds / zoom **13** single venue; no GPS | **VISUALLY-WRONG** + **BLOCKED-LOGIC** | Feels like catalog map, not “going out” |
| Map darkness / style | Day/night styles + brand tint overlay | `StyleURL.Dark` only | **VISUALLY-WRONG** | |
| Heat layer | `venue-heat` heatmap | None | **BLOCKED-LOGIC** | |
| Venue pins / labels | Multi-layer glow, categories | Simple circles + labels | **VISUALLY-WRONG** | |
| GPS puck / follow | `watchPosition` + controls | None | **BLOCKED-NATIVE-API** (`P2O-B`) | |
| Filter tray glass | `backdrop-blur-xl` + category accents | `GlassSurface intense` + static chips | **VISUALLY-WRONG** | Chips visual-only (honest) |
| Filter chip semantics | Filters venue set | No-op (labeled) | **BLOCKED-LOGIC** | |
| Checkpoint bar | Heat-tinted shadow, pulse, prev/next venue | Glass bar; nav **disabled** | **VISUALLY-WRONG** + **BLOCKED-LOGIC** | |
| Bottom nav when sheet open | **Hidden** via `map-venue-sheet-visibility` | `tabBarStyle: { display: 'none' }` | **VISUALLY-WRONG** | Custom `FloatingTabBar` may **not** respect option — verify on device |
| Venue sheet height | `74svh`, `rounded-t-[1.75rem]` | `maxHeight: 74%`, radius 28 | **PARITY-COMPLETE** (approx) | |
| Sheet blur | `backdrop-blur-2xl` + heat rim pulse | Blur + **gradient fill** + static rim | **VISUALLY-WRONG** | Missing activity-driven rim |
| Backdrop dim | Map still visible, sheet stacks | `rgba(0,0,0,0.42)` press dismiss | **PARITY-COMPLETE** (approx) | |
| Map immersion | Full viewport, layers, motion | Full bleed but **sparse** | **VISUALLY-WRONG** | Reads as “map screen” not PWA map |

---

### 3. Glass / blur system (critical)

**Where `BlurView` is used:** all `GlassSurface` instances (tab bar, hub search, active friends card, venue chips, map overlays, chat header/list, venue sheet, auth back, etc.) — see `apps/mobile/src/components/GlassSurface.tsx`.

**Implementation issue (root cause of “flat” simulator):**

| Layer | Web `.ah-glass-control` | Native `GlassSurface` |
|-------|-------------------------|------------------------|
| Blur | `backdrop-filter: blur(24px)` on **same** element as tint | `BlurView` **under** children |
| Tint | `rgb(10 12 24 / 0.72)` combined with blur | **Additional** full-screen overlay `rgba(10,12,24,0.72)` **on top of** blur |
| Sheen | CSS `::before` gradient | Flat `View` 6% white |

Native stacks **~72% opaque charcoal over the blur**, which visually reads as **tint-only fallback** even when `expo-blur` is linked (`Podfile.lock` shows `ExpoBlur`).

**`canUseNativeBlur()`:** returns `true` for all iOS/Android — does **not** detect blur failure; always applies heavy tint overlay.

| Surface | Blur expected | Likely perceived | Category |
|---------|---------------|------------------|----------|
| Tab bar | Frost over map/content | Milky panel | **VISUALLY-WRONG** |
| Hub search | Frost | Milky pill | **VISUALLY-WRONG** |
| Map checkpoint / filters | Strong frost | Milky tray | **VISUALLY-WRONG** |
| Venue sheet | `blur-2xl` | Blur + dark gradient (better, still heavy) | **VISUALLY-WRONG** |
| Section action pills | Glass | Solid `rgba(10,12,24,0.72)` | **VISUALLY-WRONG** | Not using `GlassSurface` |

**Rebuild verification checklist:**

1. `npx expo prebuild` after `expo-blur` install  
2. Confirm `ExpoBlur` in `Podfile.lock` / Gradle  
3. Compare tab bar over **scrolling hub content** vs solid background — frost only visible with content behind  
4. After fix: reduce tint overlay to ~`0.35–0.45` when blur active, or use `backgroundColor: transparent` on frame

**Expo Go:** may lack full blur — **BLOCKED-NATIVE-API** for QA unless dev client.

---

### 4. Native-vs-web semantic carryover

| Semantic | PWA | Native hook today | Preserved for later? |
|----------|-----|-------------------|----------------------|
| Profile avatar tab | Avatar + ring when active | `FloatingTabBar` + `ProfileAvatar` | **Yes** |
| Story ownership | `hasMyActiveStory`, composer event | `variant="add"` only | **Yes** (`paritySemantics.ts`) |
| Unseen / read rings | `story_views` + `ringActive` | `defaultFriendStoryRingState() → seen` | **Yes** — not faked |
| Venue activity / heat | `user_presence` aggregation | `VenueHeatVisualState` placeholder | **Yes** |
| Map sheet hierarchy | Sheet > checkpoint > nav (z-index) | Sheet z-index 20; nav hide **unverified** | **Partial** |
| Map ↔ venue | `venueId` query, camera flyTo, heat | Tap → sheet; no camera sync | **BLOCKED-LOGIC** |
| Ghost mode | `profiles.ghost_mode`, map filters | Not surfaced | **Yes** — settings/presence phase |
| Active / live / recent | `user_presence`, freshness windows | Empty states + copy | **Yes** |
| Integrated search | `/search` + hub pill → discovery | Local filter on loaded rows only | **Partial** — philosophy documented |
| Modal / sheet stack | z-index ladder 10150–10200 | Simplified stack | **Partial** |
| Notification badge | Hub heart + chat tab | Not shown | **Yes** — REALTIME + reads |
| Chat unread | BottomNav badge | Not shown | **Yes** |
| Filter chips (map) | Category + presence | Visual preview only | **Yes** (labeled) |
| District flow / friend trails | Map layers | None | **BLOCKED-LOGIC** |

---

### 5. Dependency / API parity (exhaustive)

#### Environment & build

| Key / config | Web | Native | Parity? |
|--------------|-----|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `EXPO_PUBLIC_SUPABASE_URL` | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Required |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Required (map) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ server | ❌ | Forbidden on device |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | ❌ | Push phase |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | ✅ server | ❌ | Push phase |
| `NEXT_PUBLIC_PLAYWRIGHT` | test | ❌ | N/A |
| `RESEND_API_KEY` | ✅ server | ❌ | Feedback API only |
| `FEEDBACK_TO_EMAIL` / `FEEDBACK_FROM_EMAIL` | ✅ server | ❌ | Feedback API only |
| Mapbox downloads token (native SDK) | N/A | dev build | Required for RN Mapbox |
| `expo-blur` / `expo-linear-gradient` | CSS | ✅ npm | VP-2 visual |
| `lucide-react-native` | lucide-react | ✅ npm | Tab icons |
| `@rnmapbox/maps` | mapbox-gl | ✅ | Map engine |
| `react-native-reanimated` | CSS motion | ✅ | Landing motion |
| SecureStore session | cookies | ✅ | Auth |

#### Supabase tables / RPCs (web uses · native does not unless noted)

| Target | Web use | Native |
|--------|---------|--------|
| `profiles` | Full | Read partial (approved) |
| `friend_requests` | Full | Read accepted |
| `blocks` | Full | Read for graph |
| `venues` | Full + images | Read partial columns |
| `stories` | Full | Hub shares read only |
| `chats` / `messages` | Full | List preview only |
| `story_views` | Unseen rings | ❌ |
| `story_likes` / `story_comments` | Engagement | ❌ |
| `user_presence` | Hub/map/live | ❌ |
| `notifications` | Hub/badge/inbox | ❌ |
| `notification_preferences` | Settings | ❌ |
| `push_subscriptions` | Web push | ❌ |
| `conversation_members` / `conversations` | Alt chat? | ❌ |
| `get_profile_for_viewer` / search RPCs | Public profile | ❌ |
| Legal consent API route | Signup | ❌ |

#### Platform features (web has · native missing)

| Feature | Web | Native |
|---------|-----|--------|
| `navigator.geolocation` / map `watchPosition` | ✅ | ❌ **P2O-B** |
| Web Push + service worker | ✅ | ❌ |
| Story camera / upload | ✅ | ❌ |
| Realtime channels | ✅ | ❌ |
| OAuth providers (if enabled) | ✅ | Email only |
| Deep links / universal links | web URLs | partial expo-router |
| Pull-to-refresh shell | ✅ | ❌ |
| PWA install / manifest | ✅ | App store build |
| Day/night map styles | ✅ | Dark only |
| Heatmap / district flow layers | ✅ | ❌ |
| Share composer / `/shares/new` | ✅ | Scaffold |
| Account pause / delete flows | ✅ | ❌ |
| Settings persistence | ✅ | Scaffold |
| Networked `/search` | ✅ | Local filter only |
| Feedback form API | ✅ | ❌ |
| Image upload (avatar/stories) | Storage writes | ❌ reads URLs only |
| Haptics | partial | ❌ |
| `ah-content-reveal` / swiper readiness | ✅ | ❌ |

---

### 6. Truth audit summary (VP-2 scope only)

| Verdict | Count (approx.) | Examples |
|---------|-----------------|----------|
| **PARITY-COMPLETE** | ~25% of chrome checks | Tokens, rail sizes, create glow, legal copy, story ring gradients |
| **VISUALLY-WRONG** | ~40% | Glass tint stack, map camera feel, hub heart affordance, section pills, map density |
| **BLOCKED-LOGIC** | ~25% | Heat, presence, unseen rings, chat, filters, engagement |
| **BLOCKED-NATIVE-API** | ~5% | GPS, push, camera, Expo Go blur |
| **INTENTIONALLY-DEFERRED** | ~5% | Checkpoint swiper, filter behavior |
| **NOT-IMPLEMENTED** | Many routes | Notifications tap, most settings, composer |

---

### 7. VP-2 signoff recommendation

| Question | Answer |
|----------|--------|
| Is **VP-2** complete per doctrine? | **No** |
| Does native feel like the **same product** as deployed PWA? | **Not yet** — reads as Intencity-themed RN shell with correct IA |
| Safe to start **P2O-B**? | **No** — doctrine forbids until VP-2 sign-off |
| Required before sign-off? | **VP-2D** visual-only pass (see below) + device QA vs signed-in PWA |

**VP-2D minimum (visual-only, no new `.from()`):**

1. **Fix glass stack** — reduce/remove post-blur tint overlay; use `GlassSurface` on section action pills; verify frost over real content  
2. **Hub chrome** — pressable notification heart (nav to scaffold OK); match active-friends empty layout (no extra card); glass “Open friends” / “All” pills  
3. **Map chrome** — default camera zoom ~14 toward user city when coords exist; verify tab bar hides with venue sheet; lighten sheet/stack shadows toward PWA  
4. **Device QA** — dev client rebuild; side-by-side hub + map + nav with production PWA session  

**After VP-2D + product review:** mark **VP-2 complete** in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md), then unblock **P2O-B** planning.

---

## §17 — VP-2D route chrome pass (2026-05-16)

**Global primitives added/fixed:** `chrome.ts`, `GlassSurface` tint reduction, `GlassPill`, `AtmosphericRow`, `AppSubpageScreen`, `ProfileOverflowMenu`, splash `AppLoadingScreen` full-bleed.

| Route | Change |
|-------|--------|
| **Hub** | Heart → `/notifications`; active friends plain empty (no glass card); section CTAs → `GlassPill` |
| **Chat** | Sticky header + hairline (no list glass card); search field without inner grey box |
| **Profile** | PWA ⋯ dropdown (Settings / Edit / Hidden / Sign out); `StoryRing` avatar; stats order Friends·Places·Shares; bottom sign out removed |
| **Settings** | Real section shell + link rows (toggles visual-only disabled) |
| **Friends** | `AppSubpageScreen` + atmospheric list dividers (no muted glass card) |
| **Splash/loading** | No `AuthScreenShell` frame — charcoal full bleed |
| **Placeholders** | No fake grey skeleton rows — honest empty copy |

**Still needs device QA vs PWA:** Map camera/sheet/tab hide, Create tab, auth marketing pages, legal scroll chrome, remaining stack routes (`notifications`, `blocks`, etc.).

**VP-2 sign-off:** still **No** until side-by-side simulator pass on every tab + stack route.

---

## §18 — Route enforcement: Profile cluster (2026-05-16)

**Method:** one route at a time vs `apps/web` + deployed PWA — structure first, atmosphere second.

### Profile (`/(tabs)/profile`) — implemented

| PWA structure | Native |
|---------------|--------|
| Header: title + `@username` + glass `h-10` ⋯ | `ProfileMenuAnchor` + matching typography |
| Dropdown `w-52` anchored under ⋯ (not bottom sheet) | `measureInWindow` + absolute dropdown |
| Grid `5.25rem \| 1fr`: `StoryRing` xl, stats, venue pill | `ProfileIdentityBlock` |
| Name under avatar (left, row 2) | `nameUnderAvatar` width 84 |
| Bio or “No bio yet.” full width | Always shown |
| Actions: white Edit + glass Share | Enabled nav + `Share.share` |
| Tabs: gap-5, accent underline glow | `profileLayout` constants |
| Tab panels: Shares + New, Archive kicker, Places | `ProfileTabGrid` copy from web |
| Sign out in menu only | Removed bottom sign out |

### Settings / Friends / nested — partial (stale note corrected 2026-05-17)

| Route | Status |
|-------|--------|
| `/settings` | Section order matches web; toggles/forms visual-only |
| `/friends` | Centered header + Blocked pill + search + list |
| `/profile-edit` | **Implemented** — form + `profiles` update |
| `/blocks` | **Implemented** — read-only lists; unblock deferred |
| `/settings/notifications` | **Implemented** — full UI; local SecureStore prefs |
| `/archive-hidden`, `/moments/[id]` (pre-2026-05-17) | Were placeholders — see **§20** |

**Next route after Profile QA:** Hub → Map → Chat → Auth → Splash.

---

## §19 — Global shell stabilization (2026-05-16)

**Shared infrastructure (fix once, all routes benefit):**

| Layer | Change |
|-------|--------|
| **Avatar pipeline** | `resolveAvatarUri` + `useMyAvatar()` — tab bar, hub own-moment, profile |
| **Hub own moment** | `OwnMomentRing` uses user photo + `+` badge (not empty `add` cell) |
| **Orphan glows** | Removed hub `atmosphereGlow` + map fallback glow |
| **Tab bar** | `tabBarMetrics` — web dimensions; `overflow: hidden` on glass; respects `display: 'none'`; layout mirrors web left/create/right; profile shows photo or `User` icon |
| **Glass presets** | `glassPresets` (`control` / `bar` / `panel` / `flat`) — consistent tint |
| **Screen inset** | `tabBarScrollInset(insets)` replaces ad-hoc `tabBarClearance` math |
| **Map sheet** | `zIndex: 110`; `tabBarHidden` bottom padding; tab bar hides via `tabBarStyle` |

**Resume route fidelity after simulator confirms:** global nav clipping, avatar consistency, no stray glows.

---

## §20 — VP-2 Re-Audit: Remaining Native Parity Debt (2026-05-17)

**Method:** Fresh inventory — `find apps/web/src/app` routes + `AppShell` overlays vs `find apps/mobile/app`; `rg ParityPlaceholderScreen` on mobile. **Not** assumed from prior chat logs.

### Global overlays (web `AppShell.tsx`)

| Web surface | Native | Status | User impact | Priority | Next slice |
|-------------|--------|--------|-------------|----------|------------|
| `ShareCommentsBottomSheet` | `ShareCommentsBottomSheet` on **Hub only** | Interaction partial | Comments from `/moments/[id]` work after 2026-05-17 slice; other routes N/A | P1 | Mount at `(app)` layout |
| `StoryCameraModal` / create composer | Missing | Missing | Cannot create moments/shares | P0 | Slice 4 |
| `StoryViewerModal` | Missing | Missing | Moments rail non-interactive | P0 | Slice 3 |
| `open-create-composer` event | Create tab page (wrong IA) | Visual mismatch | Center FAB does not match web | P0 | Slice 4 |

### Route parity debt (remaining placeholders = 7 after `/moments/[id]`)

| Web surface | Native surface | Status | Read | Interaction | Action | Blocked P2O-B+ | User impact | Priority |
|-------------|----------------|--------|------|-------------|--------|----------------|-------------|----------|
| `/moments/[id]` | `/moments/[id]` | **Share/post detail only** (2026-05-17) — **not** story viewer | ✅ `stories`, `profiles`, `story_likes`, `story_comments` | ✅ like, comments when `is_share`; owner menu | ✅ hide/delete shares | — | Hub share cards → detail works; **moments rail still dead** | P0 viewer separate |
| `/u/[username]` | `/u/[username]` | Placeholder | — | — | — | — | Profile taps dead-end | P0 |
| `/search` | `/search-discovery` | **VP-2 chrome (2026-05-17)** | ✅ venues, profiles, friends | ✅ local + RPC search | — | — | FoF/live badges later | P1 |
| `/archive/hidden` | `/archive-hidden` | Placeholder | — | — | — | — | Hidden shares menu dead-end | P1 |
| `/live-places` | `/live-places` | Placeholder | — | — | — | **Presence reads** | Live places link dead-end | P1 (UI shell OK) |
| `/venue-activity` | `/venue-activity` | Placeholder | — | — | — | — | Rare stack route | P2 |
| `/venue-detail` (stack) | `/venue-detail` | Placeholder | — | — | — | — | Map deep links | P2 |
| `/shares/new` | `/shares/new` | Placeholder | — | — | — | — | Cannot create share | P0 |
| `/stories` | *(no route)* | Missing | — | — | — | — | Composer entry | P0 |
| `/settings/account/delete` | Missing | Missing | — | — | — | — | Account lifecycle | P2 |
| `/settings/account/pause` | Missing | Missing | — | — | — | — | Account lifecycle | P2 |
| `/onboarding/username` | Missing | Missing | — | — | — | — | Post-signup gate | P1 |
| `/profile/[user_id]` | `/u/[username]` only | Partial | — | — | — | — | UUID profile links | P2 |

### Implemented routes with remaining debt

| Web surface | Native | Status | Gaps | Priority |
|-------------|--------|--------|------|----------|
| `/hub` | `(tabs)/hub` | Visual ~75% / Interaction ~55% | Story viewer; composer; active friends live; FR on hub N/A | P0–P1 |
| `/map` | `(tabs)/map` | Visual **~70%** / Interaction ~35% (2026-05-17) | Branded layer paint, heat, GPS, presence | P1 UI done; **blocked** presence/heat |
| `/chat` + `/chat/[id]` | chat tab + `/chat/[id]` | List read parity; thread shell | Message history + send + realtime | P0 thread |
| `/notifications` | `/notifications` | Partial | `notifications` feed; accept/deny | P0 |
| `/profile` | `(tabs)/profile` | Structural strong | Tab grids empty; counts | P1 |
| Auth (`/login` only live) | auth stack | Partial | signup/forgot/reset | P1 |

### Approved Supabase tables (mobile code, 2026-05-17)

`profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages`, **`story_likes`**, **`story_comments`** (+ Auth). **Not** `notifications`, **not** `user_presence`.

### VP-2 sign-off

Still **No** — **7** `ParityPlaceholderScreen` routes remain + global story/composer overlays missing.

---

## §21.3 — VP-2 gap classification + surgical pass (2026-05-17)

| Surface / Feature | Web behavior | Native (pre-pass) | Fix now VP-2? | Blocked until | Reason |
|-------------------|--------------|-------------------|---------------|---------------|--------|
| Friends roster `/profile/friends` | Full roster, FR, search, presence subtitles | Basic list, no profile nav | **Partial** — nav added | P2O presence | Presence subtitles need `user_presence` |
| Friends-of-friends / suggested | RPC + add-friend CTAs | Empty copy on search | No | Phase 2 + RPC | `loadFriendsOfFriendsSuggestions` |
| Public profile `/u/[username]` | Full profile + grids + ring | Placeholder | No | VP-2 next slice | Route shell only |
| Profile shares grid | `ProfileStoriesGrid` | Empty grid | **Yes** (2026-05-17) | — | `stories` approved |
| Profile share count | Count `is_share` rows | Hardcoded `0` | **Yes** (2026-05-17) | — | Same query as web |
| Profile places tab | Venue history from stories+presence | Empty | Partial UI | P2O + stories `venue_id` | Needs presence/history |
| Profile venue label | Live presence headline | Static “Not at a venue” | No | P2O-B/C | `user_presence` |
| Moment ring / viewer | `StoryViewerModal` | Missing | No | VP-2 P0 slice | Overlay, not presence |
| Share detail `/moments/[id]` | Feed detail | Implemented | Maintain | — | Done |
| Share create `/shares/new` | Camera page | Placeholder | No | VP-2 composer | Camera modal |
| Search bar glass | Single `.ah-glass-control` | Double border / nested glass | **Yes** (2026-05-17) | — | `GlassSearchField` + `preset="control"` |
| Search explore | Recent/FoF/Trending | Partial | Partial | FoF RPC | Suggested empty honest |
| Map category filter | Web matchers + campus exclusion | Drifted matchers | **Yes** (2026-05-17) | — | Ported `venueCategoryAccent.ts` |
| Map pins | Canvas category glyphs | Purple circles | **Partial** (2026-05-17) | — | `MarkerView` + lucide icons; not canvas-identical |
| Map checkpoint position | `safe-area + 124px` on **bar only** | Wrapper included Browse list below bar | **Yes** (2026-05-18) | — | `mapCheckpointBarBottom()` + column stack |
| Map Ghost control | `self-end` below Friends | Wrong row | **Yes** (2026-05-17) | — | Layout fix |
| Map attribution/logo | `attributionControl: false` | Visible Mapbox logo | **Yes** (2026-05-17) | — | Disabled on `MapView` |
| Map heat / density | Heatmap layers | None | No | P2O-C+ | User accepted deferral |
| Map GPS / distance on checkpoint | `formatMilesFromMeters` | “Tap to open venue” | No | P2O-B | No `expo-location` |
| Notifications feed | `notifications` table | Shell / partial | No | Table approval + slice | Not approved |
| Chat thread | Realtime messages | List only | No | VP-2 thread slice | Messages read partial |
| Live places / venue activity | Presence-driven | Placeholders | No | P2O | — |
| Archive hidden grid | Hidden shares grid | Placeholder | Partial | VP-2 slice | Route exists |

**Surgical fixes shipped 2026-05-17:** `venueCategoryAccent.ts`, `GlassSearchField`, profile shares grid, map checkpoint offset, map controls layout, Mapbox logo/attribution off, category pin icons via `MarkerView`, friends row → `/u/`.

**Checkpoint fix (2026-05-18):** PWA anchors **only** the swiper bar at `safe-area + 124px`. Native anchored a wrapper that also contained “Browse list” **below** the bar, lifting the swiper ~28–36px. Fixed: `mapCheckpointBarBottom(insets)` in `tabBarMetrics.ts`; browse affordance stacks **above** the bar.

---

## §24 — Final VP-2 Surgical Parity Audit (2026-05-18)

### Map fixes this pass

| Issue | Root cause | Fix |
|-------|------------|-----|
| Checkpoint too high | `MAP_CHECKPOINT_GAP_ABOVE_NAV_PX=70` + native-only “Browse list” above bar | Gap → **10px** visual above tab chrome; removed browse list (PWA has none); bar uses `GlassSurface preset="control"` |
| Friends/Locate glass drift | Custom rgba pills, not shared glass | `MapGlassPill` → `preset="control"` |
| Category chip density | `py-6` vs web `py-1` | `paddingVertical: 4`, chip row spacing |
| Pins not icon-only | Circle wrapper vs canvas glyph | Icon-only + `shadowRadius: 10` (web `shadowBlur: 10`) |
| Mapbox logo | — | Already `logoEnabled={false}` / `attributionEnabled={false}` |

### Confidence % (honest)

| Surface | Visual | Functional | Notes |
|---------|--------|------------|-------|
| Hub | 78% | 72% | Feed + rings + viewer; no live active friends |
| Map | 72% | 65% | Chrome improved; heat/GPS/presence deferred |
| Search | 80% | 70% | Glass fixed; FoF/suggested empty |
| Profile | 75% | 70% | Own shares + viewer; places/archive partial |
| Stories | 70% | 68% | Viewer shipped; not canvas-identical glyphs |
| Create flow | 75% | 65% | FAB sheet + library upload; no live camera |
| Nav shell | 85% | 80% | Tab bar strong; overlay hide works |

### VP-2 vs P2O split

**Missing VP-2 (product, no GPS):** archive-hidden grid, venue-detail/activity shells, notifications feed, chat thread send, signup/forgot, mutual friends on `/u/`, places tab data, auth onboarding completion, suggested friends in search.

**Correctly deferred P2O:** GPS puck, checkpoint distance, `user_presence`, heatmap, ghost write, live friends on map, push, realtime chat, venue inside/nearby counts.

### P2O-B readiness

**NO-GO.** Native env is healthy; product surfaces improved but Map is not pixel-1:1 (canvas glyphs), and 5+ routes remain placeholder. Re-run simulator map checkpoint + FAB + `/u/` after this pass, then tackle archive/venue/notifications VP-2 slices.

---

## §23 — VP-2 Final Lockdown — Product Surfaces (2026-05-18)

**Shipped in this slice:**

| Surface | Status | Notes |
|---------|--------|-------|
| `/u/[username]` | **Functional** | `PublicProfileScreen` + `get_profile_for_viewer` RPC, shares grid, friend CTAs, block/unfriend menu |
| `StoryViewerModal` | **Functional** | Fullscreen progression, tap zones, swipe-down close, likes, delete, share comments sheet |
| Create FAB / composer | **Functional** | `CreateComposerProvider` + sheet + library upload (`expo-image-picker`); tab bar hides during overlays |
| `/shares/new` | **Functional** | Deep link opens composer (shares mode), not placeholder |
| Hub moment rings | **Wired** | Tap own/friend rings → viewer or create |
| Profile moment ring | **Wired** | Avatar tap → viewer or create |

**New Supabase usage:** `story_views` (read/upsert for seen rings), `get_profile_for_viewer` RPC, `send_pending_friend_request` RPC (fallback insert).

**Still placeholder (VP-2 follow-up):** `archive-hidden`, `live-places`, `venue-detail`, `venue-activity`; notifications feed; chat realtime; signup/forgot flows; mutual friends strip on public profile; places tab data; live camera (library-only for now).

**P2O-B unlock after VP-2 sign-off:** GPS puck, checkpoint distance, `user_presence` reads/writes, ghost persistence, live friends on map.

---

## §22 — VP-2 Ultra Verification — Go/No-Go Before P2O-B (2026-05-18)

**Verdict: NO-GO for P2O-B** (updated after §23). Core product surfaces (public profile, story viewer, create) are now implemented; remaining blockers are secondary routes + auth/signup + notifications table. Re-run device QA on hub rings → viewer → profile `/u/` → create FAB before P2O-B.

**Legend:** A = matches enough for VP-2 · B = VP-2 fix required now · C = partial now / complete later · D = blocked (P2O-B/C/D or later)

| Surface | Web behavior | Native current | Cat | Exact gap | Fix now? | Blocked by | Priority |
|---------|--------------|----------------|-----|-----------|----------|------------|----------|
| **Auth login** | Email/password | ✅ wired | A | — | — | — | — |
| **Auth signup** | Full signup | Fields disabled | B | Non-functional | Yes | — | P1 |
| **Forgot/reset** | Supabase reset | Disabled placeholders | B | Non-functional | Yes | — | P2 |
| **Onboarding username** | `/onboarding/username` | Partial route | C | Flow incomplete | Partial | — | P2 |
| **Hub feed** | Share cards + rail | ✅ `HubShareFeedCard` | C | No story viewer tap-through | Partial | VP-2 overlay | P0 |
| **Hub search** | → `/search` | ✅ launcher | A | — | — | — | — |
| **Search overlay** | Glass pill + Cancel | ✅ `GlassSearchField` | A | FoF/suggested empty | Partial | RPC | P2 |
| **Map checkpoint** | Bar @ safe+124 | Fixed column stack | A | Re-verify device | Maintain | — | P0 |
| **Map pins/filters** | Category logic + glyphs | Lucide markers | C | Not canvas-identical | Partial | — | P2 |
| **Map heat/GPS** | Heatmap + distance | None / no mi | D | — | No | P2O-B/C | — |
| **Map friends rail** | Live presence | Static list | D | — | No | `user_presence` | — |
| **Venue sheet** | Full density | Partial chrome | C | Inside/nearby counts | Partial | P2O-C | P2 |
| **Venue detail/activity** | Full pages | Placeholder | B | Dead-end | Yes | VP-2 shell | P2 |
| **Live places** | Presence list | Placeholder | D | — | No | P2O-C | — |
| **Profile own** | Grid + counts + ring | Shares grid ✅ | C | Ring, places, venue label | Partial | P2O / overlay | P0 |
| **Profile public `/u/`** | Full public profile | Placeholder | B | Dead-end from friends | Yes | VP-2 slice | P0 |
| **Archive hidden** | Hidden grid | Placeholder | B | Route only | Yes | `stories` | P2 |
| **Friends page** | FR + search + suggested | Roster + search UI | C | FR actions, suggested | Partial | RPC/presence | P1 |
| **Share detail** | `/moments/[id]` | ✅ `MomentDetailScreen` | A | Owner menu hide/delete | Partial | — | P2 |
| **Share create** | `/shares/new` camera | Placeholder | B | — | Yes | VP-2 composer | P0 |
| **Moments viewer** | `StoryViewerModal` | Missing | B | — | Yes | VP-2 overlay | P0 |
| **Notifications** | Table feed + FR | Shell | D | Table not approved | No | Approval + slice | — |
| **Chat list** | Previews + unread | ✅ previews | C | Unread badge | Partial | — | P2 |
| **Chat thread** | Realtime send | Scaffold | C | Send/realtime | Partial | VP-2 thread | P1 |
| **Settings** | Full settings tree | Partial | C | Delete/pause routes | Partial | — | P2 |
| **Notif settings** | Toggles + quiet hours | ✅ UI | C | Supabase persist | Partial | table | P2 |
| **Blocks** | Block/unblock | Read lists | C | Actions | Partial | — | P2 |
| **Legal** | terms/privacy/guidelines | ✅ routes | A | — | — | — | — |
| **Bottom nav** | Glass pill | ✅ `FloatingTabBar` | A | Composer vs tab | Partial | VP-2 modal | P1 |

### Surfaces that only become fully functional after P2O-B/C/D

- Map GPS puck, checkpoint distance (`• 0.3 mi`), auto-tour
- Map friend avatars on canvas, ghost_mode **write**, live friends panel
- Map heatmap / district flow / density counts on venue sheet
- Profile “at venue” headline, places tab history, live badges on search
- Notifications feed + push-driven updates
- Chat realtime delivery + unread sync
- Live places, venue activity presence lists

### Must still fix inside VP-2 (before P2O-B)

1. **P0:** `StoryViewerModal`, `/u/[username]`, `/shares/new` composer, hub ring → viewer
2. **P0:** Map checkpoint verified on device (this pass)
3. **P1:** Friends FR UI (using approved tables), chat thread send (messages table approved)
4. **P1:** Signup/forgot functional parity
5. **P2:** Archive hidden grid, venue detail shell content, app-wide glass on sheets/headers
6. **P2:** Auth onboarding completion, settings account subroutes

### Recommendation

**Stay in VP-2.** Ship P0 slices above, re-run device QA on Map + Search + Profile, then re-evaluate Go/No-Go. **Do not start P2O-B** until the P0 table rows are A or honest C with labeled deferrals.

---

## §21.2 — Search + Map flagship parity (2026-05-17)

**Search web:** `apps/web/src/app/search/page.tsx`, hub launcher `apps/web/src/app/hub/page.tsx` (→ `/search`).

**Search native:** `DiscoverySearchScreen.tsx`, `HubSearchLauncher.tsx`, `/search-discovery` route. Hub no longer uses inline RN list — matches web navigation.

| Surface | Web | Native (2026-05-17) | Remaining |
|---------|-----|---------------------|-----------|
| Discovery overlay | Full page + Cancel | ✅ sticky glass header + Cancel | FoF suggestions RPC parity |
| Explore empty | Recent / Suggested / Trending | ✅ sections + skeletons | Live badges (presence) |
| Search results | Card rows + avatars | ✅ `DiscoverySearchRow` | Add-friend CTAs on people |
| Hub entry | Tap → `/search` | ✅ `HubSearchLauncher` | — |

**Map web:** `apps/web/src/app/map/page.tsx` (branded basemap, filters, checkpoint, friends rail, heat).

**Map native:** `map.tsx`, `VenuesMapCanvas.tsx`, `MapAtmosphereOverlay`, `MapCategoryFilterTray`, `MapCheckpointBar`, `MapSecondaryControls`.

| Surface | Web | Native (2026-05-17) | Remaining |
|---------|-----|---------------------|-----------|
| Basemap | Branded dark-v11 paint | dark-v11 + atmosphere tint overlay | Full `applyBrandedBasemapTheme` layer paint |
| Filters | Nightlife/Campus/Food/Events + icons | ✅ category chips + filter logic | — |
| Checkpoint bar | Venue name + arrows + heat rim | ✅ `MapCheckpointBar` @ `mapCheckpointBarBottom` | Distance/GPS, auto-tour; device QA |
| Secondary | Locate / Friends / Ghost | ✅ visual controls | GPS, presence, ghost write |
| Venue pins | Heat/glow/category | ✅ accent glow + core | Heatmap, district flow |
| Sheet | Full density | `MapVenueSheet` partial | Inside/nearby counts (presence) |

**VP-2 readiness:** Search **~75%** visual/product chrome; Map **~70%** atmosphere/chrome (not P2O realtime). Neither is sign-off complete.

---

## §21.1 — Bottom nav parity enforcement (2026-05-17)

**Web source:** `apps/web/src/components/BottomNav.tsx`, `apps/web/src/app/globals.css` (`.ah-glass-control`).

**Native:** `FloatingTabBar.tsx`, `tabBarMetrics.ts`, `TabBarProfileAvatar.tsx`, `GlassSurface.tsx` (`preset="bar"`), `glass.ts`, `glassPresets.ts`.

| Token | Web | Native (fixed) |
|-------|-----|----------------|
| Bar width | `min(100vw-16px, 360px)` | `tabBarBarWidth(screenWidth)` |
| Host pad | `px-3` | `hostPaddingX: 12` |
| Bar pad | `px-2 py-1.5` | `8 / 6` |
| Radius | `rounded-2xl` (1.15rem) | `18.4` |
| Side layout | `flex-1 justify-end/start gap-1` | `sideLeft` / `sideRight` (was `space-evenly`) |
| Create glow | `0 0 22px rgba(122,60,255,0.48)` | `shadowRadius: 22` (was 11) |
| Profile | `h-7` + ring-offset-black/70 | `TabBarProfileAvatar` offset+ring math |
| z-index | `10150` | `tabBarMetrics.zIndex` |
| Sheen | `linear-gradient(white/6% → transparent)` | `LinearGradient` on bar preset |

**Remaining nav gaps (not visual chrome):** chat unread badge; center FAB opens **composer modal** on web vs **Create tab** on native; map hide rules match but verify on device.

---

## §21 — Moments vs Shares: Product Model & Entry Points (2026-05-17)

**Doctrine:** Moments and Shares are **separate product systems** on web. Native must **not** merge them into one generic post type, viewer, modal, or route. Re-run this section after every major VP-2 slice.

### Storage (shared table, distinct semantics)

Both live in `public.stories` with `is_share` normalized via `isStoryRowShareFlag` (`apps/web/src/lib/storyRowShare.ts`, `apps/mobile/src/lib/hubFeedSemantics.ts`).

| Flag | Product | UX family | Typical expiry | Hub section |
|------|---------|-----------|----------------|-------------|
| `is_share: false` | **Moment** | Story rail + **StoryViewerModal** (fullscreen, progress, tap-through) | `expires_at` (~24h) | **Moments** rail (`!is_share`, active only) |
| `is_share: true` | **Share** | Feed cards + **post detail** (likes, comments, owner ⋯) | Persistent (hidden via `share_hidden`) | **Shares** feed (`is_share`, `!share_hidden`) |

**Do not confuse:**

- **`/moments/[id]`** (web `moments/[id]/page.tsx`, native `MomentDetailScreen`) = **post/detail** for a single `stories` row. UI **branches on `is_share`** (comments/likes only when share; archive via `?view=archive`). This is **not** the story viewer.
- **`StoryViewerModal`** (`AppShell` + Hub/Profile) = **moments viewer** (groups by user, progress bars, `recordStoryView` when `!is_share`). Can show share-like chrome if a share is in the group, but Hub **never** puts shares in viewer groups.
- **`StoryCameraModal`** `mode: "moments" | "shares"` + **`/shares/new`** = **creation** (9:16 moment vs 4:5 share vs dedicated share page).

### Web surfaces inventory

| Surface | Type | `is_share` | Native status |
|---------|------|------------|---------------|
| Hub Moments rail | Entry → **StoryViewerModal** | false only in groups | ✅ **2026-05-17** active-moment filter + viewer taps; hub RT refresh deferred |
| Hub Shares feed | Entry → **`/moments/[id]`** | true | **HubShareFeedCard** + detail route ✅ |
| `StoryViewerModal` | Overlay | moments in group | ✅ Native `StoryViewerModal` (in-group advance); no cross-user queue |
| `StoryCameraModal` | Overlay | both modes | **B/C** — library upload only; no live camera/filters — [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) |
| `/moments/[id]` | Stack page | both (UI branches) | **Share detail parity** ✅; non-share detail read-only OK |
| `/shares/new` | Stack page | true | **C** — deep link opens composer, not dedicated camera page |
| `/stories` | Route | — | No native route (composer alias) |
| `ProfileStoriesGrid` mode `shares` | Grid → **`/moments/[id]`** | true | ✅ `fetchMyProfileShares` + grid |
| `ProfileStoriesGrid` mode `archive` | Grid → **`/moments/[id]?view=archive`** | mixed | ✅ `fetchProfileArchive` + grid; `/archive-hidden` for hidden-share mgmt |
| Profile own moment ring | Entry → viewer or composer | false | ✅ Hub + profile avatar tap → viewer/composer |
| `ShareCommentsBottomSheet` | Global sheet | true | Hub + moment detail only (not `(app)` shell) |
| Notifications `story_*` | Deep link → **`/moments/[id]`** | varies | Notifications page exists; feed table N/A |

### Entry-point matrix (must verify per slice)

| Entry | Web target | Native target today | Parity |
|-------|------------|---------------------|--------|
| Hub → Your moment (no story) | `open-create-composer` moments | `openCreateComposer` | ✅ |
| Hub → Your moment (has story) | StoryViewerModal | `openStoryViewer` | ✅ |
| Hub → friend ring | StoryViewerModal | `openStoryViewer` (active only) | ✅ |
| Hub → share card / comment | `/moments/[id]` + sheet | `/moments/[id]` + sheet | ✅ |
| Hub search → share row | `/moments/[id]` | list row only (no nav) | ❌ |
| Profile → moment ring | viewer / composer | viewer / composer | ✅ |
| Profile → Shares grid | `/moments/[id]` | grid + nav | ✅ |
| Profile → Archive tab | archive grid + `?view=archive` | archive grid + nav | ✅ |
| `/u/[username]` grids / ring | same as profile | placeholder | ❌ |
| Notifications like/comment | `/moments/[id]` | no feed | ❌ |
| Map venue sheet / live places | venue routes | partial map shell | ❌ |
| `/shares/new` | share composer page | composer redirect | **C** |
| Center nav FAB | `open-create-composer` | composer sheet → library modal | **B/C** — crash risk on iOS |

### Native implementation honesty (2026-05-18)

- **`MomentDetailScreen`** = web **`/moments/[id]` post detail** (not the story viewer).
- **Hub** splits Moments rail vs Shares feed correctly.
- **Viewer + rail + rings** — largely migrated ([VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md)).
- **Creation** — partial library path only; **not** `StoryCameraModal` parity; **iOS library crash likely** — [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md).
- **VP-2 signoff:** viewing + share interactions in scope; full camera/MEDIA-1 out of scope; **no hard crash** on create entry.

### Friends & Map (separate VP-2 debt)

- **Friends** (`/profile/friends`): web has roster, search, incoming/outgoing FR, suggested, mutuals, presence subtitles, block gates — native `/friends` is **basic** (not full parity). See §20 profile/hub rows.
- **Map**: Mapbox ≠ parity. Web has atmosphere, sheets, filters, layering — native is functional shell. **No** presence/heat until P2O; **yes** VP-2 atmosphere pass before sign-off.

### P0 slice order (unchanged; systems explicit)

1. **`/u/[username]`** — public profile + grids (shares vs moments entry points)
2. **`StoryViewerModal`** — Moments system (rail, profile ring, friend rings)
3. **`StoryCameraModal`** + **`/shares/new`** — Shares/Moments **creation** (separate modes; do not merge)
4. Notifications feed + FR actions
5. Chat thread
6. Search/discovery
7. Profile grids + archive hidden
8. Map VP-2 atmosphere (no GPS/presence)
9. Friends full parity

### Periodic audit checklist

After each slice: (1) `find apps/web/src/app` + `rg StoryViewer|ShareComments|open-create` in web; (2) `find apps/mobile/app` + `rg ParityPlaceholder`; (3) update §20–§21 tables; (4) simulator pass for **every row** in entry-point matrix above.

---

## §25 — Current PWA vs Native Capability Delta — Before Real Device Visual QA (2026-05-18)

**Method:** Code audit of `apps/web/src` vs `apps/mobile` (not memory). **No implementation** in this pass — tracking doc for manual iPhone QA.

**Phase key:** **A** = in native (complete enough to build on) · **B** = VP-2 product/visual gap now · **C** = partial UI now, logic/data later · **D** = P2O-B · **E** = P2O-C · **F** = P2O-D · **G** = Phase 3+

### Route map (web → native)

| Web route | Native route | Status |
|-----------|--------------|--------|
| `/hub` | `(tabs)/hub` | **C** — feed + rings + viewer; no live active friends |
| `/map` | `(tabs)/map` | **C** — chrome + catalog pins; no heat/presence/GPS |
| `/search` | `/search-discovery` | **C** — search + recents; no FoF suggestions |
| `/chat`, `/chat/[id]` | `(tabs)/chat`, `/chat/[id]` | **C** — list + shell; no send/realtime |
| `/notifications` | `/notifications` | **C** — FR list read; no `notifications` feed/actions |
| `/profile` | `(tabs)/profile` | **C** — own profile + shares grid + viewer |
| `/profile/friends` | `/friends` | **C** — roster + nav; no FR respond/search filter |
| `/profile/blocks` | `/blocks` | **C** — read lists; unblock disabled |
| `/profile/edit` | `/profile-edit` | **C** — edit works; avatar upload disabled |
| `/u/[username]` | `/u/[username]` | **C** — functional profile; no mutuals/places data |
| `/moments/[id]` | `/moments/[id]` | **A/C** — share detail + comments/likes |
| `/shares/new` | `/shares/new` | **C** — opens composer (library upload) |
| `/archive/hidden` | `/archive-hidden` | **B** — placeholder |
| `/live-places` | `/live-places` | **B** — placeholder |
| `/venue-activity` | `/venue-activity` | **B** — placeholder |
| *(venue sheet on map)* | `/venue-detail` | **B** — placeholder (web uses map sheet) |
| `/settings` | `/settings` | **C** — structure; feedback/delete/pause missing |
| `/settings/notifications` | `/settings/notifications` | **C** — UI; **local** prefs only |
| `/settings/account/delete` | — | **B/G** — missing route |
| `/settings/account/pause` | — | **B/G** — missing route |
| `/login` | `(auth)/login` | **A** |
| `/signup` | `(auth)/signup` | **B** — UI only, fields disabled |
| `/forgot-password`, `/reset-password` | same | **B** — disabled |
| `/onboarding`, `/onboarding/username` | `(auth)/onboarding` | **B** — marketing shell only |
| `/terms`, `/privacy`, `/guidelines` | same | **A** |
| `/stories` | `(tabs)/create` → composer | **C** — FAB/sheet, not `/stories` page |
| `/profile/[user_id]` | `/u/[username]` | **C** — UUID links need redirect (web has redirect) |
| `/u/test` | — | **G** — dev-only web route |

**Remaining `ParityPlaceholderScreen` routes (4):** `archive-hidden`, `live-places`, `venue-detail`, `venue-activity`.

---

### Master capability table (by feature)

| Feature / Surface | PWA today | Native today | Status | Missing from native | Phase | Blocker |
|-------------------|-----------|--------------|--------|---------------------|-------|---------|
| **Auth login** | Supabase sign-in | Same | **A** | — | — | — |
| **Auth signup** | Full signup + profile row | Disabled form | **B** | Working signup | **B** | VP-2 auth slice |
| **Forgot/reset password** | Supabase flows | Disabled | **B** | Password recovery | **B** | VP-2 auth |
| **Onboarding / username gate** | `/onboarding/username` | Static steps | **B** | Username capture | **B** | VP-2 |
| **Hub share feed** | Friends' shares + likes/comments | Same (approved tables) | **A/C** | Realtime refresh | **E** | No channel |
| **Hub active friends** | `user_presence` driven | Static empty copy | **C** | Live roster | **E** | `user_presence` |
| **Hub moment rail** | Rings + viewer + composer events | Rings + viewer + composer | **A/C** | Realtime story updates | **E** | No channel |
| **Hub notifications toast** | Realtime `notifications` | None | **C** | Toast/badge | **E/F** | Table + push |
| **Map basemap** | Branded dark + atmosphere | dark-v11 + tint overlay | **C** | Full layer paint | **E** | Mapbox style API |
| **Map category filters** | Chips + logic | Ported `venueCategoryAccent` | **A/C** | Pixel polish | **B** | VP-2 visual QA |
| **Map category pins** | Canvas glyphs | Lucide icon-only + glow | **C** | Canvas-identical art | **B** | VP-2 optional |
| **Map venue heat floor** | Heatmap layer | None | **C** | Heat colors on ground | **E** | `user_presence` agg |
| **Map venue glow layer** | `VENUE_GLOW_LAYER` | None | **C** | Activity halos | **E** | Presence agg |
| **Map district flow** | `districtFlowTrails` | None | **G** | District trails | **G** | P2O-C+ |
| **Map friend avatars** | Presence markers on map | None | **C** | Live friends on map | **E** | `user_presence` |
| **Map GPS / locate** | `watchPosition` + ease | Refit catalog bounds only | **C** | User location | **D** | P2O-B |
| **Map camera follow user** | Yes | No | **C** | Follow puck | **D** | P2O-B |
| **Map checkpoint swiper** | Portal + heat rim + distance | Bar + prev/next; no mi | **C** | Distance text | **D** | P2O-B |
| **Map ghost mode** | Writes `profiles.ghost_mode` | Toggle visual only | **C** | Persistence | **D/F** | Profile write |
| **Map friends panel** | Presence subtitles + map focus | Static list | **C** | Online/venue subtitles | **E** | `user_presence` |
| **Map venue sheet** | Full sheet + inside/nearby | Partial chrome | **C** | Live counts | **E** | `user_presence` |
| **Map auto-tour** | Idle checkpoint cycle | Manual arrows only | **C** | Auto tour | **E** | Presence optional |
| **Mapbox attribution** | Hidden | Hidden | **A** | — | — | — |
| **Moments StoryViewer** | Full modal + views | `StoryViewerModal` shipped | **A/C** | Push on view; filters | **F/G** | Notifications |
| **Moments create** | `StoryCameraModal` camera | Library picker upload | **C** | Live camera/filters | **B/G** | VP-2 polish |
| **Moments story_views** | `story_views` upsert | Same | **A** | — | — | — |
| **Shares feed cards** | Full card | `HubShareFeedCard` | **A/C** | `createNotification` | **F** | `notifications` table |
| **Share detail `/moments/[id]`** | Page + comments/likes | `MomentDetailScreen` | **A/C** | Owner hide via menu parity | **B** | VP-2 |
| **Share comments sheet** | Sheet + notify | `ShareCommentsBottomSheet` | **A/C** | Notifications on comment | **F** | `notifications` |
| **Share create `/shares/new`** | Camera page (unlinked) | Composer deep link | **C** | Web camera page parity | **B** | VP-2 |
| **Archive hidden shares** | Grid | Placeholder | **B** | Hidden grid | **B** | VP-2 |
| **Profile own shares** | Grid + count | Same | **A** | — | — | — |
| **Profile places tab** | History from stories+presence | Empty state | **C** | Venue history | **E** | `user_presence` + data |
| **Profile venue label** | Live presence headline | "Not at a venue" | **C** | Live label | **E** | `user_presence` |
| **Profile archive tab** | Expired + hidden link | Shell + link to placeholder | **C** | Archive content | **B** | VP-2 |
| **Public profile `/u/`** | Full + RPC | `PublicProfileScreen` | **C** | Mutual friends row | **B** | VP-2 |
| **Friends page** | Search, FR, presence | Roster + search launcher | **C** | Accept/decline, suggested | **B/E** | VP-2 / presence |
| **Friends-of-friends search** | RPC suggestions | Empty copy | **C** | FoF RPC | **B** | VP-2 |
| **Search profiles** | RPC + presence badges | RPC works | **A/C** | Ghost badges on search | **E** | `user_presence` |
| **Search trending** | Presence-weighted | Static venue list | **C** | Live trending | **E** | `user_presence` |
| **Notifications feed** | `notifications` table | "Caught up" shell | **C** | Activity rows | **F** | Table not approved |
| **Notifications FR actions** | Accept/deny + notify | Buttons disabled | **C** | Accept/deny writes | **B/F** | VP-2 + table |
| **Chat list** | Previews + realtime | Read previews | **A/C** | Live updates | **E** | Realtime |
| **Chat thread** | Send + realtime | Read-only shell | **C** | Send message | **E** | Realtime |
| **Chat new DM** | Create via `conversations` | No "new chat" flow | **C** | DM creation | **B/E** | VP-2 / schema |
| **Settings feedback** | API route | Disabled inputs | **B** | Submit feedback | **G** | API |
| **Notif prefs** | `notification_preferences` table | SecureStore local | **C** | Server persist | **F** | Push slice |
| **Push subscribe** | Web push + `push_subscriptions` | None | **G** | Push | **G** | P2O-D |
| **Block/unblock** | Full writes | Block insert on public profile; list read-only on `/blocks` | **C** | Unblock button | **B** | VP-2 |
| **Legal consent** | `legal_consents` | Static legal pages | **C** | Consent capture | **G** | API |
| **Account delete/pause** | RPCs | Missing routes | **B** | Lifecycle | **G** | Product |
| **Bottom nav** | Glass + composer event | `FloatingTabBar` + composer | **A/C** | Unread badge | **E** | Notifications |
| **Glass system** | `.ah-glass-control` | `GlassSurface` presets | **C** | Full app uniformity | **B** | VP-2 QA |
| **Realtime (all)** | Supabase channels | Auth session only | **C** | All live updates | **E** | Phase 2N+ |

---

### Map / heat / presence (explicit)

| Effect | PWA | Native | Phase |
|--------|-----|--------|-------|
| Category filter chips | Yes | Yes (glass pass) | **A/C** |
| Category pin icons (logic) | `venueCategoryAccent` | Ported | **A** |
| Pin visual (canvas glyphs) | Canvas 152px | Lucide ~20px | **B** optional |
| Venue label layer | Symbol layer | Symbol layer | **A/C** |
| Heatmap layer (`venue-heat`) | Yes | No | **E** (P2O-C) |
| Venue glow circles (`venue-glow`) | Yes | No | **E** (P2O-C) |
| Checkpoint heat rim/pulse | From `activity` | Static accent only | **E** |
| Friend presence markers | Yes | No | **E** (P2O-C) |
| Inside/nearby on sheet | From presence | Placeholder counts | **E** |
| Distance on checkpoint | GPS | None | **D** (P2O-B) |
| Ghost mode persist | `profiles` update | UI toggle only | **D/F** |
| Locate / follow camera | GPS | Catalog refit | **D** |
| District flow trails | Yes | No | **G** |

---

### Moments vs Shares (explicit)

| | MOMENTS (ephemeral) | SHARES (posts) |
|--|-------------------|----------------|
| **Viewer** | `StoryViewerModal` — **A/C** native | N/A (use detail page) |
| **Detail route** | N/A | `/moments/[id]` — **A/C** |
| **Hub rail** | Tap → viewer — **A/C** | Feed cards — **A/C** |
| **Create** | Composer moments tab + camera — **C** | Composer shares tab — **C** |
| **Views** | `story_views` — **A** | N/A |
| **Likes/comments in viewer** | Likes only in viewer | Comments in viewer for shares only |
| **Profile grid** | Ring only | Shares tab grid — **A** |
| **Archive** | Expired moments tab | Hidden shares — **B** placeholder |
| **Notifications** | `createNotification` on like | Same on like if table existed — **F** blocked |

---

### Supabase: PWA vs native (verified `.from()` / RPC / storage)

**Native tables used today:** `profiles`, `friend_requests`, `blocks`, `venues`, `stories`, `chats`, `messages`, `story_likes`, `story_comments`, `story_views` (+ Auth). **Storage:** `stories` bucket upload.

**Native RPCs:** `get_profile_for_viewer`, `send_pending_friend_request`, `search_profiles_discovery`.

| PWA table / RPC / storage | Native uses? | Phase if missing |
|---------------------------|--------------|------------------|
| `profiles` | Yes | — |
| `friend_requests` | Yes | — |
| `blocks` | Yes (read + block on public profile) | — |
| `venues` | Yes | — |
| `stories` | Yes | — |
| `story_likes` | Yes | — |
| `story_comments` | Yes | — |
| `story_views` | Yes | — |
| `chats` | Yes | — |
| `messages` | Read only (previews) | **E** for send |
| `notifications` | **No** | **F** (approval) / activity feed |
| `notification_preferences` | **No** (local SecureStore UI) | **F** |
| `user_presence` | **No** | **E** (P2O-C read) |
| `push_subscriptions` | **No** | **G** |
| `legal_consents` | **No** | **G** |
| `conversations` / `conversation_members` | **No** (web `chat.ts` helper) | **G** — native uses `chats` |
| `reports` | **No** | **G** |
| `get_profile_for_viewer` | Yes | — |
| `search_profiles_discovery` | Yes | — |
| `send_pending_friend_request` | Yes | — |
| `profiles_for_story_commenters` | **No** (direct profile query) | **C** |
| `loadFriendsOfFriends` / FoF RPC | **No** | **B** |
| `request_account_deletion` / `pause_my_account` | **No** | **G** |
| `reactivate_my_account_after_login` | **No** | **G** |
| Storage `stories` | Yes | — |

---

### Lists for tracking

**Native-complete (functional enough):** Login; hub share feed read; share like/comment/delete (owner); moment/share viewer; own profile shares grid; public profile core; friend roster read; venue catalog map; search profiles/venues; legal pages; bottom nav + create composer shell.

**Native-partial (UI exists, logic incomplete):** Map chrome; profile tabs; friends/notifications/chat; search explore; settings; blocks list; share/moment create (library not camera).

**VP-2 missing (no P2O required):** Archive hidden; venue placeholders; signup/forgot/reset; onboarding; FR accept on notifications; FoF suggestions; mutual friends on `/u/`; unblock on blocks page; profile edit avatar; notification prefs → server; remaining glass drift.

**Intentionally deferred P2O-B:** GPS, locate, distance, camera follow-user.

**Intentionally deferred P2O-C/D:** `user_presence` read/write, heatmap/glow, live friends, venue density, ghost persist, trending/live places.

**Phase 3+:** Push, realtime channels, account delete/pause, feedback API, district flow, web push infra.

---

### Confidence % (before device QA)

| Surface | Visual | Functional | Notes |
|---------|--------|------------|-------|
| Hub | 78% | 72% | Viewer + composer shipped |
| Map | 72% | 38% | Chrome ↑; logic still P2O |
| Search | 80% | 68% | FoF empty |
| Profile | 76% | 70% | Shares grid live |
| Stories (viewer) | 74% | 70% | No camera/filters |
| Shares (feed/detail) | 78% | 75% | No notif side-effects |
| Create flow | 76% | 62% | Library upload only |
| Nav shell | 85% | 78% | Overlay hide works |
| Friends/social | 70% | 45% | FR actions weak |
| Notifications | 65% | 25% | Table blocked |
| Chat | 72% | 35% | No send/realtime |
| Auth | 60% | 40% | Login only |
| **Overall VP-2 product** | **~74%** | **~58%** | **NO-GO for P2O-B** |

---

### Recommended order after real-device visual QA

1. **Map** — checkpoint position, pins, chips, friends row, sheet chrome (VP-2 visual only).
2. **Global glass** — search, headers, sheets, rows (VP-2).
3. **Hub + Profile + `/u/`** — spacing, rings, grids, CTAs (VP-2).
4. **Notifications + Friends** — enable FR accept/deny if `notifications` approved (VP-2/B).
5. **Auth stack** — signup/forgot/reset/onboarding (VP-2).
6. **Placeholders** — archive-hidden, venue shells (VP-2).
7. **Then P2O-B** — GPS + checkpoint distance only after sign-off above.

**P2O-B readiness: NO-GO** until device QA passes on items 1–3 and placeholder count accepted.

---

## Risks / guardrails

- **Collapsing Moments + Shares** into one viewer/route/modal → breaks Intencity product identity; **`/moments/[id]` ≠ story viewer** (see **§21**).
- **Starting `P2O-B` before VP-2 sign-off** → native will ship GPS on an app that still looks like a separate product; **forbidden** until **VP-2D** + product review complete.
- **Skipping read-only thread** before realtime → may accumulate tech debt on message pagination/RLS; still acceptable if product prioritizes map.
- **`P2O-B` location without write path** (when resumed) → users may assume presence updates; copy + product must clarify until **P2O-D**.
- **Dual-write** (`P2O-D`) remains the **single highest** operational risk — never ship without cohort + metadata ([PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md)).
- **`u/test`** — exclude from parity or delete on web before native mirrors.

---

## Suggested first implementation prompt (after audit)

> **Implement `VP-2` only:** Side-by-side every existing native screen with **deployed PWA** — fix **Visual mismatch** rows in §11 (color, logo, type, glass, spacing, nav, loading, auth, Hub, Map **chrome**, Chat, Profile, Moments, Friends, placeholders). **No** `expo-location`, **no** `user_presence`, **no** new `.from()`, **no** writes, **no** realtime, **no** camera. **`P2O-B` remains paused** until **VP-2** is documented complete in [MIGRATION_PHASES.md](./MIGRATION_PHASES.md).

*( **`VP-1` / `P2O-A`**: scaffolds/engine only — **not** parity. Docs-only gate for this doctrine update satisfied; implementation = **`VP-2`** next.)*
