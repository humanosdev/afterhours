# Auth failure audit (native + shared Supabase project)

**Date:** 2026-05-17  
**Scope:** `apps/mobile` auth flows vs `apps/web` PWA, shared Supabase project `oegbqaxtxcajbaszcgqe`.  
**Status:** Root cause identified for signup failures; forgot-password “failure” is often silent non-delivery, not SDK error.

---

## Executive summary

| Symptom (device QA) | Real underlying cause | Was mapping wrong? |
|---------------------|----------------------|-------------------|
| Signup fails immediately on fresh `@temple.edu` emails | Supabase **`over_email_send_rate_limit`** (HTTP 429) — **project-wide outbound email quota**, not per-user “too many attempts” | **Yes** — UI said “too many signup attempts” |
| Forgot password “does nothing” / no email | `/recover` often returns **200 with no error** even when mail cannot be sent (privacy + quota) | **Partially** — user sees success while inbox empty |
| Reset link doesn’t open app / no session | Redirect URL not in Supabase allow list, or Expo Go `exp://` vs prod `intencity://` mismatch | Separate config issue — classify as `redirect_not_allowed` when API returns it |
| “Rate limit” on everything | Loose substring matchers (`rate limit`, `security purposes`, `password`) on **message text only** | **Yes** — fixed with code-first `classifyAuthError()` |

**This is not fake rate limiting in the client.** Signup failures against the live project reproduce as real `over_email_send_rate_limit` from Supabase Auth.

---

## 1. Real underlying Supabase errors (API probes)

Probed with project anon key (same as mobile/web), May 2026:

### Signup `POST /auth/v1/signup`

```json
{
  "code": "over_email_send_rate_limit",
  "message": "email rate limit exceeded"
}
```

- **HTTP status:** 429  
- **Meaning:** The **Auth email send quota** for the Supabase project is exhausted (confirmation emails count toward this). Affects **all new signups** that require confirmation mail, regardless of whether the email address was never used before.

### Recover `POST /auth/v1/recover`

- **HTTP status:** 200, body `{}`  
- **SDK:** `resetPasswordForEmail` returns `{ error: null }`  
- **Meaning:** Request accepted. Supabase does **not** reveal whether the address exists. If the project is at email send quota, **mail may not be sent** but the client still gets success.

### Not observed in quick probes

- Per-user `only request this once every 60 seconds` on recover (can still appear under burst; classified separately from project quota).
- `signup_disabled` on this project.

---

## 2. Redirect / session / deep-link audit

| Item | Value / behavior |
|------|------------------|
| Native scheme | `intencity` (`app.config.ts`) |
| Reset redirect built via | `Linking.createURL("reset-password")` → typically `intencity://reset-password` (dev client) |
| Expo Go | May use `exp://…/--/reset-password` — **must be allowlisted separately** if testing in Go |
| Token exchange | Hash/query `access_token` + `refresh_token` → `supabase.auth.setSession` (`authDeepLink.ts`) |
| Recovery UX gate | `PASSWORD_RECOVERY` or `SIGNED_IN` with session, or successful `createSessionFromUrl` |
| Auth layout fix (prior) | Session no longer forced to `/hub` on all auth routes — onboarding + reset-password preserved |

**Checklist (Supabase Dashboard → Authentication → URL configuration):**

1. Add `intencity://reset-password`
2. Add Expo dev URL if using Expo Go (copy from dev log `[auth:forgot_password] redirectTo`)
3. Site URL should match production web origin used by PWA
4. Confirm **email confirmations** setting matches product expectation (if confirm required, signup always sends mail → hits send quota faster)

---

## 3. Incorrect mappings (before fix)

| Provider signal | Old native UX | Correct semantics |
|-----------------|---------------|-------------------|
| `code: over_email_send_rate_limit`, msg “email rate limit exceeded” | “Too many signup attempts right now…” | **Project email send limit** — wait 15–60m; not user fault |
| Generic `msg.includes("rate limit")` on forgot (PWA has this too) | Same “too many reset emails from this device” | Only when code/message is **email send** or **request** limit, not all errors |
| `msg.includes("password")` on signup | Always “password requirements” | **Removed** — only `weak_password` or explicit weak-password phrases |
| `msg.includes("security purposes")` alone | Treated as rate limit | Now requires **60s** phrasing or explicit per-request throttle copy |
| Recover `error: null` | “Password reset email sent” | Honest: “If an account exists…” + note that **quota can block delivery** while API succeeds |

**PWA parity note:** Web signup still uses message-substring mapping (`apps/web/src/app/signup/page.tsx` lines 53–78) with the same misleading “too many signup attempts” for `email rate limit`. Native is now **more accurate** than PWA for this code; consider porting `classifyAuthError` to web in a follow-up.

---

## 4. Corrected auth error semantics (native)

**Source of truth:** `apps/mobile/src/lib/authErrors.ts`

- Classify by **`error.code` first**, then careful message fallback.
- **`logAuthDebug(flow, payload)`** — structured JSON in **`__DEV__` console only** (temporary diagnostics).
- Wired in: `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `login.tsx`, `authDeepLink.ts`.

### Dev logging tags

| Flow | Console prefix | Key phases |
|------|----------------|------------|
| Signup | `[auth:signup]` | `signUp_complete`, `signUp_error_classified`, `session_immediate` |
| Forgot | `[auth:forgot_password]` | `redirect_url_built`, `resetPasswordForEmail_response`, `recover_error_classified` |
| Reset | `[auth:reset_password]` | `deep_link_parse`, `set_session_result`, `auth_state_change`, `updateUser_error` |

**Device QA:** Reproduce on device, filter Metro logs for `[auth:` and attach `rawError.code` / `classification` to tickets.

---

## 5. Required Supabase / ops changes

1. **Raise or wait out email send rate limit**  
   - Dashboard → Project Settings → Auth (or check [Supabase rate limits](https://supabase.com/docs/guides/platform/going-into-prod#rate-limits))  
   - Default built-in SMTP is heavily capped; **custom SMTP** (Resend, SendGrid, etc.) is the durable fix for campus launch traffic.

2. **Redirect allow list**  
   - `intencity://reset-password`  
   - Dev URLs from `logAuthDebug` `redirectTo` when testing.

3. **Email confirmation policy**  
   - If `enable_confirmations = true`, every signup sends mail → hits quota under load.  
   - Align with PWA; do not disable without product sign-off.

4. **Monitor**  
   - Auth logs in Supabase Dashboard for 429 / `over_email_send_rate_limit` spikes during QA.

---

## 6. Stabilized native auth behavior (expected)

| Flow | Success | Failure |
|------|---------|---------|
| Signup | Session → `/onboarding`; else verification success copy | Truthful classification; project quota message when `over_email_send_rate_limit` |
| Forgot | Honest success + delivery caveats | SDK error → `classifyAuthError` |
| Reset | Deep link / `PASSWORD_RECOVERY` → update password → login | Parse/session errors logged; update errors classified |
| Login | `resolvePostAuthHref` | `invalid_credentials` / `email_not_confirmed` by code |

---

## 7. Follow-ups (not blocking logging/semantics)

- [ ] Port `authErrors.ts` to `apps/web` for PWA parity on signup/forgot copy  
- [ ] U5: legal consent API on native signup when session immediate  
- [ ] VP-2 device pass: capture one `[auth:signup]` log line on failing device to confirm code in field  
- [ ] Chat read-only history — **blocked until this audit signed off in QA**

---

## Appendix: files touched

- `apps/mobile/src/lib/authErrors.ts` (new)
- `apps/mobile/src/lib/authDeepLink.ts` (logging + parse helper)
- `apps/mobile/src/lib/authValidation.ts` (delegates to classifier)
- `apps/mobile/app/(auth)/signup.tsx`
- `apps/mobile/app/(auth)/forgot-password.tsx`
- `apps/mobile/app/(auth)/reset-password.tsx`
- `apps/mobile/app/(auth)/login.tsx`
