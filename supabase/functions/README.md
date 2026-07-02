# Supabase Edge Functions

## `push-notify` (Phase 1 native cutover)

Fans out Expo + Web Push for one recipient. Replaces native calls to `https://getintencity.com/api/push/notify`.

### Deploy

From **repo root** `/Users/gleeshshiest/intencity` (not `~`):

```bash
cd /Users/gleeshshiest/intencity
supabase db push   # creates feedback_submissions table (once)
supabase functions deploy push-notify
supabase functions deploy feedback
```

### Secrets

Use **real values** from Vercel / Resend — not placeholder `...`:

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set FEEDBACK_TO_EMAIL=Support@getintencity.com
supabase secrets set FEEDBACK_FROM_EMAIL=Contact@getintencity.com
```

#### push-notify

| Secret | Required | Notes |
|--------|----------|--------|
| `EXPO_ACCESS_TOKEN` | Optional | Expo push API token |
| `VAPID_PUBLIC_KEY` | For web push subs | Same as web `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` | For web push subs | Same as web `VAPID_PRIVATE_KEY` |
| `VAPID_SUBJECT` | Optional | `mailto:support@getintencity.com` |

#### feedback

| Secret | Required | Notes |
|--------|----------|--------|
| `RESEND_API_KEY` | Yes | Same as Vercel web |
| `FEEDBACK_TO_EMAIL` | Yes | Inbox for feedback |
| `FEEDBACK_FROM_EMAIL` | Yes | Verified Resend sender |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

```bash
supabase secrets set EXPO_ACCESS_TOKEN=your_token
supabase secrets set VAPID_PUBLIC_KEY=your_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set FEEDBACK_TO_EMAIL=support@getintencity.com
supabase secrets set FEEDBACK_FROM_EMAIL=Contact@getintencity.com
```

### Verify push-notify

Native app sends a DM with **web product closed**. Recipient should get a push if they have a token in `push_subscriptions`.

**iOS lock-screen QA:** blocked until [NATIVE_CUTOVER_PT2.md](../../docs/NATIVE_CUTOVER_PT2.md) (Apple Developer Program). Use Android or PWA web push to validate the edge function path.

Logs: Supabase Dashboard → Edge Functions → push-notify → Logs.

### Verify feedback

Native app → Settings → Send feedback. Should succeed without `EXPO_PUBLIC_WEB_ORIGIN`.

Full Resend + secrets guide: [FEEDBACK_RESEND_SETUP.md](../../docs/FEEDBACK_RESEND_SETUP.md)

Logs: Supabase Dashboard → Edge Functions → feedback → Logs.

### Auth

Both functions require `Authorization: Bearer <user JWT>` from the signed-in native client.
