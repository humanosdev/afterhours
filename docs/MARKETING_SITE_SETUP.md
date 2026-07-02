# Marketing site setup guide

**Status:** Active ops reference  
**App:** `apps/web` (Next.js on Vercel)  
**Related:** [NATIVE_CUTOVER.md](./NATIVE_CUTOVER.md) Phase 6 · [SUPABASE_MIGRATION_OPS.md](./SUPABASE_MIGRATION_OPS.md)

---

## What the live site is

Production web is **marketing-only** by default (`NEXT_PUBLIC_WEB_SITE_MODE=marketing` or unset).

| Public | Blocked |
|--------|---------|
| `/` homepage | `/hub`, `/map`, `/login`, all product routes |
| `/terms`, `/privacy`, `/guidelines`, `/contact` | `/api/*` except waitlist + site-access |
| `/site-access` (password gate page) | Old PWA app surfaces |

The native iOS app is the product. Web = download page, legal, waitlist, contact.

**Launch positioning (copy):** Philadelphia first · iOS TestFlight · day + night (food, campus, events, nightlife).

---

## One-time checklist

Do these in order when standing up or fixing production.

### 1. Push code to GitHub

Vercel deploys from `main`. Static assets under `apps/web/public/` **must be committed** or images 404 in prod (e.g. phone screenshots in `public/marketing/`).

```bash
cd /path/to/intencity
git push origin main
```

### 2. Apply Supabase waitlist migration

Run once on your production Supabase project:

**File:** `supabase/migrations/zzz_marketing_waitlist.sql`

**Options:**

- Supabase Dashboard → **SQL Editor** → paste file contents → Run  
- Or linked CLI: `supabase db push`

**Verify:**

```sql
select to_regclass('public.marketing_waitlist');
-- should return marketing_waitlist
```

Signups land in **Table Editor → `marketing_waitlist`** (service role only; no public read).

### 3. Set Vercel environment variables

**Vercel → Project → Settings → Environment Variables → Production**

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_WEB_SITE_MODE` | No | Omit or `marketing`. Never `app` in prod. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** (waitlist) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No for marketing pages | Only if you add client Supabase later |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (waitlist) | Server writes to `marketing_waitlist` via `/api/waitlist` |
| `MARKETING_SITE_PASSWORD` | Optional | Preview gate — **empty = site is public** |
| `MARKETING_SITE_ACCESS_TOKEN` | Recommended with Sensitive password | Random string (not Sensitive) — cookie value for Edge middleware |
| `MARKETING_SITE_ACCESS_SECRET` | Optional | Salts the access cookie when no access token is set |
| `NEXT_PUBLIC_IOS_APP_STORE_URL` | When live | App Store link; until set, shows “Coming soon” + waitlist |

**Password aliases (same behavior):** `SITE_PASSWORD`, `SITE_ACCESS_PASSWORD`

**Do not set** `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` unless you re-enable Android in the UI later.

### 4. Redeploy

After **any** env change: **Deployments → … → Redeploy**. Old builds do not pick up new variables.

---

## Site password gate

### How it works

1. Visitor hits any page on **any browser or device**.
2. **Server layout gate** (Node) checks `MARKETING_SITE_PASSWORD` — works even when the password is marked **Sensitive** on Vercel.
3. **Edge middleware** also checks access when `MARKETING_SITE_ACCESS_TOKEN` is set (non-sensitive).
4. If no valid cookie → redirect to `/site-access`.
5. User enters password → server action sets httpOnly cookie (30 days) → full redirect back.

### Sensitive password on Vercel

If `MARKETING_SITE_PASSWORD` is marked **Sensitive**, Edge middleware **cannot read it**. The site still locks via the server layout gate, but for faster redirects also add:

| Variable | Example | Sensitive? |
|----------|---------|------------|
| `MARKETING_SITE_ACCESS_TOKEN` | `openssl rand -hex 24` output | **No** |

Login sets the cookie to this token. Middleware can validate it on Edge.

Alternatively: uncheck **Sensitive** on `MARKETING_SITE_PASSWORD` (preview-only password).

### If the password page never appears

| Cause | Fix |
|-------|-----|
| `MARKETING_SITE_PASSWORD` not set on Vercel | Add it under **Production**, redeploy |
| Env set on Preview only, not Production | Add to Production scope |
| Old deploy still running | Redeploy latest `main` |
| Code with `/site-access` not pushed | `git push origin main` |
| Cached homepage HTML | Hard refresh; layout is now `force-dynamic` when gated |

### Disable the gate

Remove `MARKETING_SITE_PASSWORD` from Vercel (or leave empty) and redeploy.

---

## Waitlist form

### How it works (user-facing)

1. User fills **Name**, **Email**, optional **Phone** on `/#waitlist`.
2. Form `POST`s to `/api/waitlist`.
3. API validates input and inserts into `marketing_waitlist` using **service role**.
4. Duplicate email → friendly “already on the list” (unique index on lower email).
5. Team emails TestFlight invites manually from the table.

There is **no** automated email on signup yet — the list is your source of truth in Supabase.

### If the form fails

| Symptom | Fix |
|---------|-----|
| “Could not save your spot” | Run `zzz_marketing_waitlist.sql` on prod |
| 503 / not configured | Set `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` on Vercel, redeploy |
| 404 on `/api/waitlist` | Push latest code; route must be exempt in marketing middleware |

### Export signups

Supabase → **Table Editor → `marketing_waitlist`** → export CSV, or:

```sql
select name, email, phone, city, created_at
from public.marketing_waitlist
order by created_at desc;
```

---

## Phone preview images

Homepage shows three screenshots from:

```
apps/web/public/marketing/app-map-overview.png
apps/web/public/marketing/app-map-screenshot.png
apps/web/public/marketing/app-map-street.png
```

Replace PNGs locally, commit, push. Blank phone in prod = file not in git.

---

## Local development

```bash
# From repo root
cp apps/web/.env.example apps/web/.env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY for waitlist testing

# Optional local password gate
echo 'MARKETING_SITE_PASSWORD=localdev' >> apps/web/.env.local

npm run dev -w web
# http://localhost:3000
```

Marketing mode is default. Set `NEXT_PUBLIC_WEB_SITE_MODE=app` only to archaeology the old PWA.

---

## Smoke test after deploy

Use an **incognito** window:

- [ ] `/` loads — hero, three phone screenshots, waitlist form  
- [ ] Submit waitlist → row in `marketing_waitlist`  
- [ ] `/hub` redirects to `/` (or `/#download`)  
- [ ] If password set: `/` redirects to `/site-access` first  
- [ ] `/terms`, `/privacy`, `/contact` load  
- [ ] Header: icon + typed slogan (no giant lockup bitmap)

---

## Troubleshooting quick reference

| Issue | Likely cause |
|-------|----------------|
| Password never prompts | Env not set or not redeployed |
| Password wrong but sure it’s right | Typo; check Production env; try redeploy |
| Waitlist 500 | Migration not applied or missing service role key |
| Broken image in phone frame | PNG not committed to `public/marketing/` |
| Still see old PWA | `NEXT_PUBLIC_WEB_SITE_MODE=app` on Vercel |
| Android buttons still showing | Old deploy; pull latest `main` (iOS-only now) |

---

## File map (for agents)

| Area | Path |
|------|------|
| Site mode | `apps/web/src/lib/webSiteMode.ts` |
| Password gate | `apps/web/src/lib/siteAccess.ts`, `middleware.ts`, `app/site-access/` |
| Waitlist API | `apps/web/src/app/api/waitlist/route.ts` |
| Waitlist UI | `apps/web/src/components/marketing/MarketingWaitlistSection.tsx` |
| Public routes | `apps/web/src/lib/publicSitePaths.ts` |
| Launch copy | `apps/web/src/lib/marketingContent.ts` |
| Migration | `supabase/migrations/zzz_marketing_waitlist.sql` |
| Env template | `apps/web/.env.example` |
