# Moderation & admin setup

## 1. Apply database migration

Run in Supabase SQL Editor (or `supabase db push`):

`supabase/migrations/zzz_moderation_reports_admin.sql`

Creates:

- `content_reports` table
- `stories.moderation_status` / `story_comments.moderation_status`
- `profiles.is_admin`
- RPCs: `submit_content_report`, `admin_resolve_moderation`
- Auto-hide at **3 distinct reporters** → `pending_review`

## 2. Create your admin account

Use the account you will log in with (native or web):

```sql
update public.profiles
set is_admin = true
where username = 'YOUR_USERNAME';
-- or: where id = 'uuid-from-auth-users';
```

**Never** expose a client UI to set `is_admin`. Only SQL / service role.

## 3. Use the moderation queue

| Platform | Path |
|----------|------|
| **Native** | Settings → **Moderation queue** (only if `is_admin`) |
| **Web** | `/admin` (redirects non-admins) |

Actions:

- **Approve (show)** — `moderation_status = visible`
- **Remove** — `moderation_status = removed` (hidden for users)

## 4. User reporting (native today)

| Content | Entry |
|---------|--------|
| Moment / share (viewer) | ⋯ → Report |
| Hub share | ⋯ → Report |
| Share / moment detail | ⋯ → Report |
| Comment | Report link on others’ comments |

Reasons are fixed categories + optional details. **No AI in v1** — human review in admin queue.

## 5. AI later (optional)

Large apps often add:

- Classifier on upload (images/text)
- Priority scoring in queue
- Duplicate / brigading detection

V1 is **reporter-driven + threshold hide + human approve/remove**.

## 6. App Store / trust

- Document this runbook for reviewers
- Ensure Community Guidelines mention reporting
- Test: 3 test accounts report same post → hidden for 4th account → admin approve restores
