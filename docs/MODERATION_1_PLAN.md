# MODERATION-1 — User reports + auto-hide (V1)

**Status:** Implemented (MODERATION-1) — apply migration + set `is_admin` before use  
**Product home:** [V1_LAUNCH_PLAN.md § Reports and Auto-Flagging](./V1_LAUNCH_PLAN.md#reports-and-auto-flagging-recommended-v1-design)  
**Era:** After core media loop polish; **not** NOTIF or **P2O-D**  
**Date:** 2026-06-02

---

## Goal

Users can **report** moments (24h stories) and **shares** from native (and eventually PWA). When **≥ 3 distinct authenticated reporters** hit the same target, the content moves to **`pending_review`** and is **hidden for normal users** until an operator restores or removes it.

**Mobile-first UI is fine. Enforcement must be server-side (Postgres + RLS).**

---

## Admin console (shipped)

- **Native:** Settings → Moderation queue (`/admin`) when `profiles.is_admin = true`
- **Web:** `/admin` — same queue, approve/remove
- Setup: [MODERATION_SETUP.md](./MODERATION_SETUP.md)

## Non-goals (still)

- Full AI moderation pipeline
- Auto-ban users from report count alone
- ML / image scanning
- Reporting DMs in v1 (optional v1.1: `target_type = message`)
- Hiding **profiles** via auto-flag in v1 (manual only unless you extend `target_type`)

---

## Architecture principle

| Layer | Responsibility |
|-------|----------------|
| **Native (and later PWA)** | Report sheet UI → `insert` into `reports` |
| **Postgres** | Unique reporter per target; count distinct reporters; set moderation state |
| **RLS on `stories`** | Normal users cannot `select` rows in `pending_review` / `removed` (except owner + future admin) |
| **Operator** | Supabase SQL: approve → `visible`, reject → `removed`, audit in `moderation_actions` (optional) |

Do **not** hide content only in the app — PWA and raw API would still show it.

---

## Data model

### 1. `public.reports`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `reporter_id` | `uuid` FK → `auth.users` | `auth.uid()` on insert |
| `target_type` | `text` | Check: `story`, `comment`, `profile` (v1: **`story` only** if you want smallest slice) |
| `target_id` | `uuid` | Story id for moments/shares (same `stories` table) |
| `reason` | `text` | Enum-like check: `spam`, `harassment`, `nudity`, `violence`, `other` |
| `details` | `text` nullable | Optional free text, max length |
| `created_at` | `timestamptz` | default `now()` |

**Constraints**

- `unique (reporter_id, target_type, target_id)` — one report per user per target
- Index `(target_type, target_id)` for counting

**RLS**

- `insert`: `reporter_id = auth.uid()`, reporter not blocked by target owner (reuse block helpers if available)
- `select`: reporter sees own rows only (operators use service role / SQL editor)

### 2. `public.stories` — moderation column

Add (names align with [V1_LAUNCH_PLAN](./V1_LAUNCH_PLAN.md)):

| Column | Type | Default |
|--------|------|---------|
| `moderation_status` | `text` | `'visible'` |

Check: `visible` | `pending_review` | `removed` | `restored`

**Interaction with existing flags**

- `share_hidden` = **owner** hide (already exists)
- `moderation_status != 'visible'` = **community / ops** hide (new)

RLS `stories_select_policy` must require:

```text
coalesce(moderation_status, 'visible') = 'visible'
```

for all non-owner, non-admin paths (in addition to existing share/moment rules).

Owner may still see own `pending_review` content (optional product choice — recommend **yes** so they know it’s under review).

### 3. Auto-flag (threshold = 3)

**Option A — trigger on `reports` insert (recommended for V1)**

After insert, if `count(distinct reporter_id) >= 3` for `(target_type, target_id)` where `target_type = 'story'`:

- `update stories set moderation_status = 'pending_review' where id = target_id`
- Idempotent: only transition from `visible` → `pending_review`

**Option B — RPC `submit_report(...)`**

Single round-trip: insert report + evaluate threshold in one function (SECURITY DEFINER, careful grants).

**Abuse considerations**

- Threshold **3** (per your spec; V1 doc allows 2–3 — stay on **3**)
- Reporter must be **authenticated**
- Cannot report self
- Cannot report if either side blocked
- Optional: rate limit reports per reporter per day (edge function or RPC — post-v1)

### 4. Operator workflow (Dashboard)

Document runbook (no UI):

1. `select * from reports where target_id = $id order by created_at`
2. Inspect story row + reporter count
3. **Restore:** `moderation_status = 'visible'` (or `restored` then visible)
4. **Remove:** `moderation_status = 'removed'` (hard hide)
5. Optional: delete story row or set `share_hidden` for owner cleanup

---

## What gets hidden

| Content | `stories.is_share` | On `pending_review` |
|---------|-------------------|---------------------|
| **Share** | `true` | Hidden from hub, profile grid, `/moments/[id]`, notifications deep link |
| **Moment** | `false` | Hidden from viewer, hub rail, public profile ring |

Comments on hidden stories: v1 can leave comments visible or hide via separate policy — **recommend** hide insert/select on `story_comments` when parent `moderation_status != 'visible'`.

---

## Native UI (MODERATION-1 scope)

### Entry points

| Surface | Action |
|---------|--------|
| `StoryViewerModal` | ⋯ menu → **Report** |
| `MomentDetailScreen` | ⋯ (non-owner) → **Report** |
| `HubShareFeedCard` | ⋯ → **Report** |
| `PublicProfileScreen` / viewer | ⋯ on others’ content → **Report** |
| Own content | No report (or disabled) |

### Sheet

- Reason chips + optional details
- Submit → `supabase.from('reports').insert(...)` or `rpc('submit_report', ...)`
- Success: toast “Thanks — we’ll review this”
- Duplicate: unique violation → “You already reported this”

### No native-only hide

Client does **not** set `moderation_status`; only DB trigger/RPC does.

---

## PWA parity (phase 1b or same PR)

Ship the **same** `reports` insert + RLS so web cannot bypass. UI can lag native by one slice if needed for App Store, but **enforcement must ship with the migration**.

---

## Implementation slices (order)

| Step | Deliverable | Est. |
|------|-------------|------|
| **M1** | Migration: `reports` table + RLS + `stories.moderation_status` + updated `stories_select_policy` + trigger/RPC | 1 PR |
| **M2** | `lib/submitReport.ts` + shared types + error mapping | small |
| **M3** | `ReportContentSheet` component + wire ⋯ menus | 1 PR |
| **M4** | Operator runbook in `docs/` + sample SQL queries | doc |
| **M5** | PWA report entry (hub + moment detail) | 1 PR |
| **M6** | QA matrix (below) | test |

**Gate:** `rg '\.from\(' apps/mobile` audit — add `reports` to approved table list in `apps/mobile/README.md`.

---

## QA matrix

| Case | Expected |
|------|----------|
| User A reports story | Row inserted |
| Same user reports again | Rejected (unique) |
| Users B, C report same story | After 3rd distinct → `pending_review` |
| Friend on hub | Story disappears after threshold |
| Owner | Still sees own post (if policy enabled) or sees “under review” banner |
| Deep link `/moments/id` | 404 / unavailable for others |
| Operator sets `visible` | Content reappears |
| Operator sets `removed` | Stays hidden |
| Blocked pair | Cannot report |

---

## Dependencies

- **Blocks** (`BLOCKS-1`) — already shipped; use in report insert policy
- **Stories RLS** — update in same migration as `zzz_public_profile_moments_select.sql` pattern
- **Not required:** NOTIF, P2O-D, push

---

## Recommended sequencing vs other work

| Priority | Slice | Why |
|----------|--------|-----|
| 1 | Finish **dev build QA** on device | Validate Mapbox, camera, push, real network |
| 2 | **MEDIA-VIEW-1** (feel) | Instant open/swipe, hub share seed — core loop trust |
| 3 | **MODERATION-1 (M1–M4)** | Before wide TestFlight / strangers |
| 4 | **P2O-D** | Presence authority — separate from safety |

If TestFlight to **strangers this week**, swap **2** and **3**.

---

## Open decisions (pick before M1)

1. **Owner sees `pending_review` content?** (recommended: yes, with badge)
2. **Report comments in v1?** (recommended: no — story only)
3. **Notify owner when hidden?** (recommended: no in v1)
4. **Threshold 3 firm?** (yes unless campus beta is very small)

---

*Mobile UI + Postgres enforcement + 3-report auto-hide. Operators use Supabase until post-V1 admin.*
