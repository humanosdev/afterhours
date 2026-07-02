# Feedback email setup (Resend + Supabase)

**Goal:** Settings → Feedback saves to `feedback_submissions` and optionally emails your inbox.

Native calls Supabase Edge Function **`feedback`** — not Vercel. Secrets live in **Supabase**, not only Vercel.

---

## 1. Resend account (where keys come from)

1. Sign in at [resend.com](https://resend.com) → **API Keys**
2. Create an API key → copy value starting with `re_`  
   → this is **`RESEND_API_KEY`**

You previously may have set Supabase secrets to literal `...` — that breaks sending. Re-set with the real key.

---

## 2. Sender domain (the confusing part)

Resend will **only send** from addresses on a **verified domain** (or their test sender).

### Production (getintencity.com)

1. Resend → **Domains** → Add `getintencity.com`
2. Add the DNS records Resend shows (SPF, DKIM, etc.) at your DNS host
3. Wait until status = **Verified**
4. Use a from-address on that domain, e.g. `Contact@getintencity.com`  
   → **`FEEDBACK_FROM_EMAIL`**

### Quick test (no domain yet)

Use Resend’s test sender (emails only go to **your Resend account email**):

- **`FEEDBACK_FROM_EMAIL`** = `onboarding@resend.dev`

Good for proving the pipeline; not for real user feedback in production.

---

## 3. Inbox address

**`FEEDBACK_TO_EMAIL`** = where feedback lands (e.g. `Support@getintencity.com`).  
Can be any valid inbox you read — does not have to be on Resend.

---

## 4. Configure Supabase (required for native)

From **repo root**:

```bash
cd /Users/gleeshshiest/intencity

# Deploy function (must run here — not from ~)
supabase functions deploy feedback

# Real values — copy from Resend + your inbox choice
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set FEEDBACK_TO_EMAIL=Support@getintencity.com
supabase secrets set FEEDBACK_FROM_EMAIL=Contact@getintencity.com
```

List secrets (values hidden):

```bash
supabase secrets list
```

---

## 5. Vercel (web PWA only)

Web `/api/feedback` still uses Vercel env if you use the PWA settings page:

| Variable | Same as Supabase |
|----------|------------------|
| `RESEND_API_KEY` | ✅ |
| `FEEDBACK_TO_EMAIL` | ✅ |
| `FEEDBACK_FROM_EMAIL` | ✅ |

Native does **not** read Vercel — only Supabase secrets.

---

## 6. Verify end-to-end

### A — Database (always required)

1. Native app → Settings → submit feedback
2. Supabase → **Table Editor → `feedback_submissions`**
3. New row with your subject/message → **pass** (feedback works even if email fails)

### B — Email (optional until domain verified)

1. Supabase → **Edge Functions → feedback → Logs**
2. No `Feedback email send failed` → check inbox
3. If 403 / domain not verified → fix Resend domain or use `onboarding@resend.dev` for testing

### C — Common failures

| Symptom | Fix |
|---------|-----|
| “Feedback service is not deployed” | `cd intencity && supabase functions deploy feedback` |
| “Could not save feedback” | Run migration / `supabase db push` for `feedback_submissions` |
| Email fails but row saved | Resend domain or `FEEDBACK_FROM_EMAIL` wrong |
| Secrets set to `...` | Re-run `supabase secrets set` with real values |

---

## 7. Phase 1 exit

- [ ] Row appears in `feedback_submissions`
- [ ] (Stretch) Email arrives with `[Intencity feedback]` subject

Email can wait on domain verification; **row in DB = native feedback path works**.
