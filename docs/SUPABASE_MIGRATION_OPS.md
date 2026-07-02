# Supabase migration ops — production status

**Status:** Lock **2026-07-02**  
**Authority:** SECONDARY ops reference ([DOCUMENTATION_GOVERNANCE.md](./DOCUMENTATION_GOVERNANCE.md))  
**Related:** [NATIVE_CUTOVER.md](./NATIVE_CUTOVER.md) · [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) · [MODERATION_SETUP.md](./MODERATION_SETUP.md)

---

## Rule for agents and humans

**Do not bulk-run every file in `supabase/migrations/` on production.** Most schema was applied over time via SQL editor / dashboard. Supabase’s migration **tracker** lists only a subset. Before applying anything, check **live DB** (function exists? policy name?) — not just the tracker.

---

## Production Supabase (linked project) — 2026-07-02

### Nothing pending for native cutover security

These are **already live** on the linked production project. **No SQL editor run required.**

| Item | Repo file | Tracker name | Live verification |
|------|-----------|--------------|-------------------|
| Native security hardening | `zzz_native_security_hardening.sql` | `native_security_hardening` | RLS: `user_presence_select_friends_visible`, `messages_insert_participant_unblocked`, no `notifications_insert_authenticated`; RPC `create_notification_v1` |
| Phase 4.5 zombie venue cleanup | `zzz_presence_stale_venue_reconcile.sql` | *(not in tracker)* | Functions `reconcile_stale_user_presence_venues`, `haversine_meters` |
| Push hardening | `supabase/functions/push-notify/index.ts` | Edge fn **v7** | Requires `notificationId` + actor match |

### What changed (security hardening summary)

1. **`user_presence` SELECT** — self + friends only; ghost friends’ rows hidden server-side.
2. **`messages` INSERT** — chat participant + no active block.
3. **`profiles` UPDATE** — trigger blocks `is_admin`, lifecycle columns, `access_level`.
4. **`notifications`** — client INSERT removed; use RPC **`create_notification_v1`** only.
5. **`push-notify`** — push only after validated in-app notification row (5‑minute window).

### Client requirements (must ship with backend)

- **Native:** rebuild after `createNotification.ts` + `requestPushNotify.ts` changes (RPC + `notificationId`).
- **Web:** redeploy if PWA still serves product users (`notifications.ts`, `/api/push/notify` auth).
- **Friend-request notifications** — still DB trigger only (unchanged).

### Tracker vs repo (known gap)

Supabase migration history may show only:

- `venue_context_copy`, `public_profile_moments_select`, `message_story_reply`, `user_profile_places`, `user_profile_venues`, `zzz_feedback_submissions`, `zzz_messages_replica_identity_full`, **`native_security_hardening`**

Many other `zzz_*.sql` files (blocks RLS, moderation, account lifecycle, discovery RPCs, etc.) are **in the DB** but **not** in that tracker. Treat repo files as **source of truth for new environments**, not as “all pending on prod.”

---

## When to apply migrations

| Scenario | Action |
|----------|--------|
| **Current production (this project)** | Apply **nothing** from the table above unless verification fails |
| **Marketing waitlist table** | Run `zzz_marketing_waitlist.sql` once if `marketing_waitlist` missing — see [MARKETING_SITE_SETUP.md](./MARKETING_SITE_SETUP.md) |
| **New Supabase project / staging** | `supabase db push` or ordered apply from repo; verify with `list_migrations` + spot-check functions/policies |
| **Single new migration** | Add `supabase/migrations/zzz_*.sql`, apply via Supabase CLI or MCP `apply_migration`, verify live |

---

## Verify live (quick SQL)

```sql
-- Security hardening
select policyname from pg_policies
where tablename = 'user_presence' and cmd = 'r';

select proname from pg_proc
where proname in ('create_notification_v1', 'reconcile_stale_user_presence_venues');

-- notifications INSERT policy should be absent
select policyname from pg_policies
where tablename = 'notifications' and cmd = 'a';
```

---

## Intentionally not in this pass (LATER)

- Message-request inbox (SecureStore-only)
- `search_profiles_discovery` private-handle exposure (product tradeoff)
- Stories storage bucket path ownership
- FoF graph visibility

See security audit in [native security chat](9e49abff-ba3d-460d-b024-f175622d0226) for full LATER list.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-02 | Lock: prod security hardening + reconcile already applied; no pending prod SQL |
