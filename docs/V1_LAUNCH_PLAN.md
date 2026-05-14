# Intencity V1 Launch Plan (PWA + App Store Path)

## Purpose

This document consolidates product direction, V1 scope, timeline expectations, risk controls, and solo-team operating rules discussed in chat. It is meant to keep work focused until first App Store launch.

---

## Status (as of 2026-05-13)

**Summary:** The core product surfaces below exist in the codebase in workable form (auth, hub/map/profile/chat routes, moments/shares, legal links, feedback API, PWA manifest + stability-oriented client scripts). **V1 “done”** still means ship-ready: regression QA, notifications stability after DB migrations, privacy copy vs actual behavior, TestFlight behavior, and crash / white-screen budgets—not only feature presence.

**Recently tightened (engineering / UX, prior to 2026-05-04):** shared session context for protected routes (no duplicate full-screen gate before skeletons on tab switch), auth-gated nav/signed-out holds, desktop column framing aligned with hub on profile + chat, map auto-tour idle tuning, accent color consistency, bottom underglow / footer contrast on in-app surfaces.

**Shipped / materially changed (2026-05-13 — account lifecycle + ops):** Pause and scheduled-delete account flows (dedicated settings subpages, Supabase RPCs + RLS + profile viewer behavior), inactive profile shell for others (“User”, empty surface), friend/map surfaces excluding non-`active` accounts, login reactivation RPC for paused users, middleware sign-out when session has no `profiles` row (e.g. post-purge), and a **service-role purge script** plus optional **GitHub Actions** daily workflow to purge public data and **delete Auth users** so emails can be reused. Full detail, file paths, commands, and **your action items** are in **Account lifecycle, purge automation, and ops** below.

**Open vs this doc (verify or build):** polymorphic **reports** table + UI/API path and optional auto-flag threshold (Section 6 + Reports section); **admin review** process documented for Supabase-dashboard ops; **weekly checkpoint** and scope freeze discipline—process items, not automatic.

**Risk hotspots:** `map/page.tsx` complexity, PWA/service worker + chunk cache, RLS/social graph edge cases, notifications + mark-read after schema changes, **account lifecycle + purge job** (scheduled deletes, Auth removal failures, edge cases if purge runs but Auth delete fails).

---

## Account lifecycle, purge automation, and ops (as of 2026-05-13)

**Document last updated:** 2026-05-13 (engineering changelog; no wall-clock timestamp stored in repo).

### What shipped (product behavior)

- **Pause account:** User signs out; `profiles` moves to `paused`; **presence** row removed; others see a generic **“User”** empty profile (no moments/shares/status/friend-style treatment). Signing in again runs **`reactivate_my_account_after_login()`** and restores **active**.
- **Delete account:** User requests deletion; `delete_pending`, `account_purge_at = now() + 30 days`; same outward “empty User” behavior until purge. User may **cancel deletion** from Settings while logged in before the purge time.
- **After grace:** Public app data for that user is removed via **`purge_user_public_data`** (includes **`user_presence`**, stories, chats/messages as defined in migration, friend graph rows, notifications prefs, etc., then **`profiles`**). **Auth user** removal is **not** done inside SQL; use the **purge script** (or Admin API manually) so the **email** can register again.

### Supabase (database) — apply and verify

| Item | Detail |
|------|--------|
| **Migration file** | `supabase/migrations/zzz_account_lifecycle_pause_delete.sql` |
| **Your action** | Apply to your Supabase project (`supabase db push`, CLI linked project, or paste SQL in Dashboard SQL editor). |
| **Columns on `profiles`** | `account_lifecycle_state` (`active` \| `paused` \| `delete_pending`), `paused_at`, `delete_requested_at`, `account_purge_at` |
| **Helpers / graph** | `profile_socially_visible`, updated **`are_friends`** (both users must be `active`) |
| **RPCs (authenticated)** | `pause_my_account`, `request_account_deletion`, `cancel_account_deletion`, `reactivate_my_account_after_login` |
| **RPCs (service_role)** | `purge_user_public_data(uuid)`, `purge_scheduled_deleted_accounts()` (integer count; optional batch SQL path). **The repo purge script** lists due ids and calls **`purge_user_public_data` per user**, then **`auth.admin.deleteUser`**—it does **not** need to call `purge_scheduled_deleted_accounts()` separately. |
| **RLS** | `profiles_select_visible_accounts` — non-owners only see **`active`** profiles; owner still sees own row when paused/pending delete |
| **Profile APIs** | `get_profile_for_viewer`, `discover_profile_by_username` — inactive targets return placeholder JSON including **`profile_inactive: true`** for non-self viewers |

**Watch:** Any later migration that recreates `profiles` policies or `are_friends` / profile RPCs must stay compatible with `account_lifecycle_state` or visibility will regress.

### Web app (`apps/web`) — routes and files

Paths below are relative to **`apps/web/`** (e.g. `src/app/...`, `middleware.ts` at package root).

| Area | Paths / files |
|------|----------------|
| **Settings hub** | `src/app/settings/page.tsx` — links to pause/delete guides; cancel deletion when `delete_pending` |
| **Pause guide + action** | `src/app/settings/account/pause/page.tsx` — `/settings/account/pause` |
| **Delete guide + action** | `src/app/settings/account/delete/page.tsx` — `/settings/account/delete` |
| **Login** | `src/app/login/page.tsx` — after upsert, **`reactivate_my_account_after_login`**; query banners `?account=paused`, `deleted`, `removed` |
| **Middleware** | `middleware.ts` (Next.js root of `apps/web`) — extended profile fetch; if **session exists but no profile row** and path is not allowlisted (`/onboarding`, `/reset-password`, `/signup`), **sign out** and redirect to `/login?account=removed` |
| **Friends / map friend ids** | `src/lib/pairBlockStatus.ts` — **`acceptedFriendIdsExcludingBlocks`** filters to friends whose profile is **`account_lifecycle_state = 'active'`** |
| **Public profile** | `src/app/u/[username]/page.tsx` — **`profile_inactive`**, `profileFromRpc`, empty shell UI (no `@handle` in header for inactive shell) |

**Auth gate:** `/settings/account/*` is under `/settings`, already covered by existing auth-gated prefixes.

### Automation — purge + delete Auth (no manual per-user Dashboard work per run)

| Item | Detail |
|------|--------|
| **Script** | `apps/web/scripts/purge-scheduled-accounts.mjs` |
| **npm scripts** | Root `package.json`: `"purge-scheduled-accounts"` → web workspace; `apps/web/package.json`: `"purge-scheduled-accounts": "node scripts/purge-scheduled-accounts.mjs"` |
| **Run (web workspace)** | `SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SUPABASE_URL=… npm run purge-scheduled-accounts` (from repo root: `npm run purge-scheduled-accounts` delegates via root `package.json`) |
| **Behavior** | Selects `profiles` where `delete_pending` and `account_purge_at <= now()`, runs **`purge_user_public_data`** per id, then **`auth.admin.deleteUser`** per id. **One command = full processing for everyone due at that moment**; it does not run continuously until invoked again. |
| **Optional schedule** | `.github/workflows/purge-scheduled-accounts.yml` — daily cron + `workflow_dispatch`; requires repo secrets **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`**. |

**Your action:** Store **service role** only in CI secrets or a private runner—never in client env or committed files.

**Watch:** If **purge** succeeds and **Auth delete** fails, you can get an Auth user **without** a profile; middleware may sign them out on protected routes. Script exits **non-zero** if any step failed—monitor CI logs if using GitHub Actions.

**Known edge (documented, not “fixed” in app):** Login still **`upsert`s** a minimal `profiles` row after sign-in; a purged Auth user who somehow still exists could recreate a profile on login. **Deleting Auth** in the purge script is the intended way to close that gap.

### What you should do (checklist)

1. **Apply** `zzz_account_lifecycle_pause_delete.sql` to production Supabase when ready.
2. **Regression-test:** pause (others see shell, map friends drop), login (reactivate), delete request (shell + cancel), purge script on a staging user past `account_purge_at`.
3. **Decide automation:** manual terminal when you remember vs enable **GitHub Action** (or other cron) with secrets.
4. **Privacy / product copy:** Ensure any public-facing help or privacy text mentions retention and deletion if you promise it to users (this doc is internal; marketing/legal may need updates separately).

### Native / other clients

This repo currently contains **`apps/web` only**. The same Supabase RPCs and `profile_inactive` behavior apply to any future native app; reimplement UI and call the same RPCs there—no second migration.

---

## Product Positioning (What Intencity Is)

Intencity is a location-first social app for going out:

- See where the night is happening (map + venues).
- See which friends are there / nearby (presence + social graph).
- See what they post from those places (moments + shares).

### Comparable blend

- Snap / Instagram: moments, shares, profile content.
- Zenly / Find My style layer: friend presence on map.
- Venue discovery apps: place-centric social context.

### Core differentiator

Not feed-first social. Not utility map only. It is the loop:

1. Where is activity?
2. Who do I know there?
3. What are they posting there?

---

## V1 Scope (Locked Until First Approval)

Anything outside this scope is deferred unless it replaces an existing V1 item.

### 1) Identity and Social Graph

- Signup, login, forgot/reset password.
- Onboarding completion flow.
- Profile (self + `/u/[username]`), edit profile basics.
- **Pause account** and **delete account (scheduled)** with dedicated explanation pages under Settings (`/settings/account/pause`, `/settings/account/delete`); cancel scheduled deletion from Settings while logged in.
- Friend requests: send/accept/decline/cancel.
- Unfriend + block.
- Friends list (your list + viewing another user list with mutual/other distinction).

### 2) Content

- Post moments.
- View moments.
- Post shares.
- View shares in profile and hub.
- Hidden/archive only if already live and stable.

### 3) Map + Venues (Core Surface)

- Map loads reliably.
- Venue markers + venue sheet.
- Friend presence (live/recent/last known behavior as currently defined).
- Friends dropdown focuses on friend location/venue.
- Tapping a friend avatar marker on map opens profile.
- Map deep links from notifications (`?venueId=`) work.

### 4) Chat (Minimal)

- Conversation list.
- Conversation thread.
- Text send/receive works.

### 5) Notifications

- In-app notification center.
- Push for current high-value notification types.
- Mark read behavior stable.

### 6) Legal, Safety, and Trust

- Terms, privacy, guidelines linked and visible.
- Feedback submission path.
- Block flow works.
- Basic report flow (store report rows + manual review for now).

### 7) PWA and Production Stability

- Installable PWA behavior.
- No recurring stale chunk/service-worker white-screen loops.
- Clean production build/start behavior.

---

## Out of Scope for V1 (V1.1+)

- Full light/dark theming rollout (unless already completed early).
- Advanced moderation console with full workflow UI.
- Rich chat features (media reactions, typing indicators, etc.).
- Contacts import and advanced discovery ranking.
- Large map architecture refactor for cleanliness only.
- Multi-campus scaling features not required for first launch.

---

## Timeline and Probability (Objective Estimate)

Assuming a true scope freeze and disciplined execution:

- Minimum ship-ready hardening after freeze: ~4-8 weeks.
- Recommended buffer for store review/rework: +2-4 weeks.
- Practical total: ~6-12 weeks from freeze to stable first submission.

### Confidence range for September launch

- 65-75%: if scope freezes early and beta is structured.
- 40-55%: if scope drifts and launch process is first-time.
- 20-35%: if new major features keep being added through July/August.

---

## Solo-Team Operating Model (To Avoid Burnout)

### Work triage rule

- P0: safety/legal/outage/core auth break.
- P1: core loop broken (map-friends-content path).
- Everything else: backlog.

### Growth control

- Soft launch first (invite-only, one campus/group).
- Keep a deliberate throttle on signups if needed.
- Add kill switches for high-risk paths (posting/push/signup) where practical.

### Product discipline

- One V1 checklist doc.
- No feature add unless swapping another scope item out.
- Weekly checkpoint: what moved V1 closer to launch.

---

## Admin and Moderation Plan (No T&S Team Yet)

## Phase 1 (V1): Supabase Dashboard-first

- Use Supabase tables and SQL for report review and actions.
- Keep operations simple and auditable.
- Do not expose service-role capabilities in client code.

### Phase 2 (Post-V1 or if volume spikes): In-app Admin

- Add `role`/`is_admin` on profile/users.
- Build `/admin` route guarded by session + server-side admin checks.
- Admin actions go through server routes (service-role key server only).

---

## Reports and Auto-Flagging (Recommended V1 Design)

Use a single polymorphic reports table:

- `reporter_id`
- `target_type` (`story`, `comment`, `profile`)
- `target_id`
- `reason`, optional `details`
- `created_at`
- Unique index on (`reporter_id`, `target_type`, `target_id`)

### Auto-flag rule

- Distinct reporter threshold (pick 2 or 3; 3 is safer against abuse).
- On threshold, set target moderation status to `pending_review` and hide for normal users.
- Keep admin-visible for decision.

### Moderation states

- `visible`
- `pending_review`
- `removed`
- `restored` (or approved equivalent)

---

## App Store Practical Readiness Checklist

- Core flow works fresh install to first meaningful action.
- No dead-end auth flows.
- Privacy and terms match actual data usage.
- Report/block paths present and functional.
- Crash and white-screen regressions controlled.
- Manual moderation process documented.
- TestFlight cohort validates real-world behavior before submission.

---

## Current Technical Hotspots (Higher Risk Areas)

- `src/app/map/page.tsx` (largest complexity and most user-critical flow).
- PWA/service worker and chunk cache interactions.
- Social graph visibility and RLS interactions (`friend_requests`, `profiles`, **`account_lifecycle_state`**).
- Moments/shares creation and viewing consistency across routes.
- **Account purge + Auth deletion** (service-role script / CI; failures leave orphaned Auth or missing profiles—see Account lifecycle section).

---

## Weekly Execution Template (Until Launch)

1. Pick top 3 P0/P1 priorities.
2. Ship and verify them in production-like conditions.
3. Run regression checks on core loop:
   - auth
   - map load
   - friends visibility
   - post/view moment/share
   - notifications
   - **pause / delete account / inactive profile shell / purge script (staging)**
4. Decide go/no-go for adding any non-critical feature.
5. Update this document status.

---

## Final Rule

V1 is not "everything we can imagine."  
V1 is "a stable, safe, repeatable core loop we can support with a small team."
