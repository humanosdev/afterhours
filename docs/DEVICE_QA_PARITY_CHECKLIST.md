# Device QA — VP-2 parity stabilization

**Purpose:** Side-by-side native dev client vs deployed PWA before VP-2 sign-off and P2O-B.  
**Rule:** Record pass/fail + screenshot notes; do not treat “screen exists” as pass.

**Full runbook:** [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) (ordered playbook + findings log + signoff gates).

---

## Auth & onboarding

- [ ] Cold start → landing
- [ ] Signup — truthful errors when email quota hit (`over_email_send_rate_limit` copy)
- [ ] Signup — verify email path when session not immediate
- [ ] Login — wrong password vs unconfirmed email
- [ ] Forgot password — success copy + email delivery (SMTP)
- [ ] Reset password — deep link `intencity://reset-password` opens thread
- [ ] Onboarding → username → hub routing
- [ ] Session persistence after kill app

## Hub

- [ ] Top chrome, search pill, sections rhythm
- [ ] Moments rail tap targets
- [ ] Live places copy (no fake counts)
- [ ] Shares feed scroll + cards

## Chat

- [ ] List previews match web ordering for same account
- [ ] Open thread — bubble sides/colors/order
- [ ] Tap bubble timestamp toggle
- [ ] Blocked peer — history visible, banner, no send
- [ ] Back stack to list

## Friends & search

- [ ] Friends local search (instant)
- [ ] Discovery debounce + friends-first results
- [ ] FoF suggestions + pills
- [ ] Find new friends navigation

## Profile

- [ ] Own profile layout, stats, grids
- [ ] Public `/u/[username]` from chat/friends header
- [ ] Private account gates

## Map (shell only — no GPS)

- [ ] Top chrome ~30px below status bar (category tray not cramped)
- [ ] Checkpoint bar width ~PWA (`min(92vw, 460px)`)
- [ ] Checkpoint clears tab bar (~10px gap)
- [ ] Venue sheet ~74% height; tab bar hides
- [ ] No sheet scrim — map visible above venue sheet (continuous city)
- [ ] Friends panel narrow (~112px) on the right
- [ ] Ghost pill read-only (no local toggle)
- [ ] **No** GPS puck / heat GL / live friend dots
- [ ] Locate refits preview camera only

See [MAP_SHELL_DRIFT_AUDIT.md](./MAP_SHELL_DRIFT_AUDIT.md).

## Shell & navigation

- [ ] Tab bar safe area + glass
- [ ] Stack push/pop transitions
- [ ] Keyboard on search/auth — no clipped fields
- [ ] Deep link recovery (reset password, optional venueId on map)
- [ ] Rotate / notch / home indicator insets

## Regression guards

- [ ] No generic auth “rate limit” when quota message expected
- [ ] Chat thread not placeholder empty card
- [ ] Map does not claim “Nearby” for friends panel
- [ ] Ghost mode not togglable locally on map

---

## Sign-off blockers (reminder)

VP-2 sign-off requires this checklist complete for **in-scope** surfaces, plus `SYSTEM_TRUTH_AUDIT.md` review. P2O-B remains blocked until then.
