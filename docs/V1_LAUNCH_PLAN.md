# Intencity V1 Launch Plan (PWA + App Store Path)

## Purpose

This document consolidates product direction, V1 scope, timeline expectations, risk controls, and solo-team operating rules discussed in chat. It is meant to keep work focused until first App Store launch.

---

## Status (as of 2026-05-04)

**Summary:** The core product surfaces below exist in the codebase in workable form (auth, hub/map/profile/chat routes, moments/shares, legal links, feedback API, PWA manifest + stability-oriented client scripts). **V1 “done”** still means ship-ready: regression QA, notifications stability after DB migrations, privacy copy vs actual behavior, TestFlight behavior, and crash / white-screen budgets—not only feature presence.

**Recently tightened (engineering / UX, not full launch sign-off):** shared session context for protected routes (no duplicate full-screen gate before skeletons on tab switch), auth-gated nav/signed-out holds, desktop column framing aligned with hub on profile + chat, map auto-tour idle tuning, accent color consistency, bottom underglow / footer contrast on in-app surfaces.

**Open vs this doc (verify or build):** polymorphic **reports** table + UI/API path and optional auto-flag threshold (§6 + Reports section); **admin review** process documented for Supabase-dashboard ops; **weekly checkpoint** and scope freeze discipline—process items, not automatic.

**Risk hotspots** (unchanged): `map/page.tsx` complexity, PWA/service worker + chunk cache, RLS/social graph edge cases, notifications + mark-read after schema changes.

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
- Social graph visibility and RLS interactions (`friend_requests`, `profiles`).
- Moments/shares creation and viewing consistency across routes.

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
4. Decide go/no-go for adding any non-critical feature.
5. Update this document status.

---

## Final Rule

V1 is not "everything we can imagine."  
V1 is "a stable, safe, repeatable core loop we can support with a small team."
