# Notifications — era placement

**Status:** Architecture lock **2026-05-20** · **Resequenced 2026-05-18** (notifications before **`P2O-D`**)  
**Authority:** Binds [PRODUCTION_ERA_MODEL.md](./PRODUCTION_ERA_MODEL.md), [MIGRATION_PHASES.md](./MIGRATION_PHASES.md), [PRESENCE_OWNERSHIP.md](./PRESENCE_OWNERSHIP.md), [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md)

---

## Decision

**Era 2 focus = notifications** while **web stays the sole `user_presence` writer** for continued side-by-side testing.

**`P2O-D` is deferred to the final gated phase** — not bundled with the first notification slices.

| Layer | Era 1 — Mirror | Era 2 — Notifications *(now)* | Era 4 — P2O-D | Era 5 — Evolve |
|-------|----------------|------------------------------|---------------|----------------|
| **Who writes `user_presence`** | **Web/PWA** | **Web/PWA** (unchanged) | **Native** sole writer | — |
| **Who creates notification rows** | Web (+ trigger for FR); native chat `message` | **NOTIF-3** display; **NOTIF-2** native creates for **native UI actions**; presence types **still web** | Presence-driven types move to native | Richer delivery |
| **Activity feed UI** | NOTIF-1 browse ✅ | Maintain + realtime | — | Polish |
| **Hub heart badge** | Not required | **NOTIF-3** | — | — |
| **In-app message toast** | Web only | **NOTIF-3** | — | — |
| **OS push** | Web Push | **NOTIF-4** | — | Background policy |
| **Prefs** | SETTINGS-1 → Supabase ✅ | Same | — | — |

**Hard rule:** Do **not** dual-write **`user_presence`**. Native may insert **notification** rows for actions the user takes **on native** (like, comment, accept FR). **`friend_online`**, venue joins, etc. stay on the **web** pipeline until **`P2O-D`**.

---

## Slices (implementation order)

| Order | Slice | Era | Status | Delivers |
|-------|--------|-----|--------|----------|
| — | **NOTIF-1** | 1 | ✅ Shipped | Feed read, grouping, tap/delete, FR accept/deny — [NOTIF_1_SLICE.md](./NOTIF_1_SLICE.md) |
| **1** | **NOTIF-3** | 2 | ✅ Shipped | Hub heart unread badge; in-app **message toast**; chat tab unread — [NOTIF_3_SLICE.md](./NOTIF_3_SLICE.md) |
| **2** | **NOTIF-2** | 2 | ✅ Shipped | Native **`createNotification`** for likes, comments, `friend_request_accepted` — [NOTIF_2_SLICE.md](./NOTIF_2_SLICE.md) |
| **3** | **NOTIF-4** | 2 | ✅ Shipped | Expo push + quiet hours — [NOTIF_4_SLICE.md](./NOTIF_4_SLICE.md) |
| **last** | **P2O-D** | 4 | **Deferred** | Presence writes + presence-driven notify orchestrator — [P2O_D_PLACEHOLDER.md](./P2O_D_PLACEHOLDER.md) |

**NOTIF-2 is no longer “with P2O-D” for all types** — only **presence-driven** notification creation waits for **`P2O-D`**.

**Story like/comment grouping (shipped):** 1–3 distinct actors → separate feed rows; 4+ → “{latest} and others liked your post”; push skipped from 4th actor — [NOTIF_STORY_ENGAGEMENT_GROUPING.md](./NOTIF_STORY_ENGAGEMENT_GROUPING.md).

---

## Types × who creates (after resequence)

All 11 DB types: `friend_online`, `friend_nearby`, `friend_joined_venue`, `friends_active_bundle`, `friend_story`, `friend_request_received`, `friend_request_accepted`, `venue_popping`, `story_like`, `story_comment`, `message`.

| Creator | Types | Until |
|---------|--------|--------|
| **Web** (`userPresenceVenueSync`, PWA actions) | Presence-driven + web UI actions | **`P2O-D`** for presence-driven |
| **DB trigger** | `friend_request_received` | Unchanged |
| **Native chat** | `message` (CHAT-1) | Unchanged |
| **Native NOTIF-2** | `story_like`, `story_comment`, `friend_request_accepted`, … from **native UI** | After NOTIF-2 ships |
| **Native P2O-D** | `friend_online`, `friend_nearby`, `friend_joined_venue`, `venue_popping`, … | **`P2O-D` only** |

---

## PWA vs native today (truth table)

| Surface | PWA | Native |
|---------|-----|--------|
| `/notifications` feed | Full | NOTIF-1 ✅ |
| Friend requests strip | Full | NOTIF-1 ✅ |
| Message in-app toast | ✅ | ✅ NOTIF-3 |
| Hub heart badge | ✅ | ✅ NOTIF-3 |
| Chat tab badge | ✅ | ✅ NOTIF-3 |
| Web Push / OS alert | ✅ | ✅ NOTIF-4 (Expo) |
| Creates story_like from native like | Web if via PWA | ✅ NOTIF-2 |
| Creates friend_online | Web | Web until **P2O-D** |
| `user_presence` write | Web | ❌ until **P2O-D** |

---

## QA gates

**NOTIF-3:** Unread heart matches feed; new DM shows top toast on native; tap → thread; chat tab badge matches unread threads.

**NOTIF-2 (pre–P2O-D):** Like from native → recipient row; **no** duplicate row if same action also fired from web; presence types **unchanged** (still from web when friend uses PWA).

**NOTIF-4:** Device receives push when backgrounded; prefs respected; tap opens route.

**P2O-D (final):** Friend goes live on **native-only** map session → `friend_online` once; no duplicate rows when web cohort disabled; rollback works.

---

*NOTIF-3 → NOTIF-2 → NOTIF-4 while web writes presence → **P2O-D last**.*
