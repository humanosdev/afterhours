# VP-2 device QA & signoff prep

**Date:** 2026-05-17  
**Question:** Does native feel like **one cohesive Intencity product** (not “screens that exist”) before P2O-B?  
**Method:** Side-by-side **dev client** vs **deployed PWA** (same Supabase account). Record in this doc + checklist.

---

## 1. QA philosophy (this phase)

| Old phase | Current phase |
|-----------|----------------|
| Does it render? | Does it **feel** production-cohesive? |
| Add screens | Tune **emotion + semantics** |
| Feature checklist | **Atmosphere + interaction** continuity |

**In scope:** interaction drift, spacing rhythm, stack/nav, keyboard/safe areas, overlay hierarchy, honest deferred copy.  
**Out of scope:** GPS, heat, live presence, send/realtime, new `.from()` without named slice.

---

## 2. Pre-device findings (codebase audit)

These are **known** from implementation audits — device QA must confirm or overturn.

### Parity drift (behavior / semantics)

| ID | Surface | Finding | Severity | Action |
|----|---------|---------|----------|--------|
| P-01 | Auth | Project email quota shows truthful copy; SMTP may block delivery while API succeeds | Med | Ops + device verify |
| P-02 | Chat | Send disabled by design | — | Document only |
| P-03 | Friends | No accept/decline on roster | Med | ⏸ writes |
| P-04 | Discovery | Trending = catalog sort, not live rank | Low | Honest label ✅ |
| P-05 | Hub | Moments rail roster drift | Med | ✅ active-only filter — [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md) |
| P-06 | Profile | Archive grid empty | Med | ✅ `fetchProfileArchive` — same doc |
| P-08 | Tab bar | Profile avatar flicker on Profile tab | Med | ✅ cache + stable ring — same doc |
| P-07 | Notifications/settings | Placeholder shells | Low | ⏸ |

### Atmosphere drift (feel / rhythm)

| ID | Surface | Finding | Severity | Action |
|----|---------|---------|----------|--------|
| A-01 | Map | No scrim — map visible above sheet; tap upper map or close to dismiss | Med | ✅ shipped |
| A-02 | Map | Night mode chrome on PWA only | Low | ⏸ P2O-C |
| A-03 | Map | Fog / basemap night on PWA only | Low | ⏸ |
| A-04 | Hub | Lucide vs web icon shapes | Low | Accept or VP-2 polish |
| A-05 | Global | Expo Go vs dev client (Mapbox) | Med | QA on **dev client** only |

### Navigation / shell (verify on device)

| ID | Scenario | Risk | Verify |
|----|----------|------|--------|
| N-01 | Chat list → thread → back | Stack vs tab | 🔍 |
| N-02 | Map sheet open → tab bar hidden → close → tab returns | Tab options reset | 🔍 |
| N-03 | Search discovery Cancel → hub vs back | Route stack | 🔍 |
| N-04 | Auth cold start with session | Redirect hub/onboarding | 🔍 |
| N-05 | `venueId` deep link on map | Sheet opens | 🔍 |
| N-06 | Kill app → resume session | Auth persistence | 🔍 |
| N-07 | Keyboard on signup/search | Clipped fields | 🔍 |
| N-08 | Metro stale bundle | Old UI | `expo start --clear` |

---

## 3. Device QA playbook (execute in order)

**Setup**
1. Dev client build (not Expo Go for map).
2. `cd apps/mobile && npx expo start --clear`
3. Same account as PWA in browser.
4. iPhone with notch + one non-notch device if available.

### A. Auth & onboarding (15 min)

| Step | Native | PWA | Pass? | Notes |
|------|--------|-----|-------|-------|
| Cold start logged out | Landing | `/` | | |
| Login → hub or onboarding | | | | |
| Signup error copy (if quota) | | | | |
| Forgot / reset deep link | | | | |
| Kill app → reopen | Session | | | |

### B. Hub (10 min)

| Step | Compare | Pass? | Notes |
|------|---------|-------|-------|
| Section rhythm, search pill | | | |
| Moments rail tap | | | |
| Shares scroll | | | |
| No fake “0 live” on live places | | | |

### C. Map — emotional center (20 min)

| Step | Compare | Pass? | Notes |
|------|---------|-------|-------|
| Top breathing room (~30px) | | | |
| Category chips glass | | | |
| Checkpoint width / tab clearance | | | |
| Open venue sheet — **map still visible above sheet, no modal black** | | | |
| Sheet height ~¾ screen | | | |
| Close sheet — city continuous | | | |
| Friends panel right rail 112px | | | |
| Ghost read-only | | | |
| No fake live dots on map | | | |

### D. Chat (10 min)

| Step | Compare | Pass? | Notes |
|------|---------|-------|-------|
| List order / previews | | | |
| Thread bubbles + timestamps | | | |
| `READ-SOCIAL-1-thread-v2` marker (__DEV__) | | | |
| Disabled send | | | |

### E. Friends & discovery (10 min)

| Step | Compare | Pass? | Notes |
|------|---------|-------|-------|
| Friends local search | | | |
| Discovery 240ms debounce | | | |
| FoF + pills | | | |

### F. Profile & stack (10 min)

| Step | Compare | Pass? | Notes |
|------|---------|-------|-------|
| Own profile layout | | | |
| Public profile from chat header | | | |
| Stack back from subpages | | | |
| Tab bar persistence across tabs | | | |

---

## 4. Device findings log (fill during QA)

_Copy rows as needed._

| ID | Surface | Finding | Severity | Fix phase |
|----|---------|---------|----------|-----------|
| | | | | |

---

## 5. Stabilization fixes (this sprint)

| Fix | Status |
|-----|--------|
| Map top inset 30px | ✅ |
| Checkpoint 460px / nav 44px | ✅ |
| Sheet 74svh, hero 168px | ✅ |
| **Remove venue sheet scrim** | ✅ |
| READ-SOCIAL-1 thread hydration + debug | ✅ |
| READ-SOCIAL-2 friends/discovery | ✅ |

**Post-QA (only if device fails):** address rows in §4 — no feature creep.

---

## 6. VP-2 signoff readiness

### Ready for signoff when ALL true

- [ ] Device QA playbook §3 completed (A–F)
- [ ] No **P0** parity lies (fake live, fake send, fake rate limits)
- [ ] Chat thread shows real history on populated chats (after `--clear`)
- [ ] Map feels continuous (undimmed city, sheet immersion)
- [ ] `VP2_STABILIZATION_INVENTORY.md` §7 updated
- [ ] Product owner accepts deferred table (§7 of inventory)

### Recommended signoff posture

| Area | Verdict (pre-device) |
|------|----------------------|
| Auth semantics | **Stable** pending SMTP/device |
| READ-SOCIAL-1/2 | **Stable** pending device |
| Map atmosphere | **Stable** after scrim removal + spacing — **device confirm** |
| Hub/profile depth | **Partial** — honest, not blocking VP-2 shell signoff |
| P2O-B | **BLOCKED** until checkboxes above |

---

## 7. Explicit blockers before P2O-B

| Blocker | Owner | Notes |
|---------|-------|-------|
| VP-2 sign-off line in `MIGRATION_PHASES.md` | Product | After device QA |
| `SYSTEM_TRUTH_AUDIT.md` reviewed | Eng | UNK waived or resolved |
| No fake geography on map | Eng | ✅ discipline |
| Dev client QA (not Expo Go) for map | QA | Mapbox token |
| Chat/auth trustworthy on device | QA | Metro clear |

**P2O-B must not start until blockers cleared** — location truth multiplies debugging cost.

---

## 8. Hub/profile QA batch (2026-05-17)

| ID | Issue | Code fix | Device re-check |
|----|-------|----------|-----------------|
| QA-F1 | Tab avatar flicker | ✅ cache + overlay ring | Required |
| QA-F2 | Hub rail all friends | ✅ active-moment filter | Required |
| QA-F3 | Archive empty | ✅ `fetchProfileArchive` | Required |
| QA-F4 | Story ring glow drift | ✅ `story_views` parity | Required |

[VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md) — findings 1–3.  
[VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md) — finding 4 (glow).  
[MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) — **canonical** creation vs viewing audit.  
[MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md) — picker stabilization + device QA steps.  
[MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) — operational behavior matrix (refresh, expiry, QA safe/not-safe).  
[MEDIA_0_2A_PARITY_AUDIT.md](./MEDIA_0_2A_PARITY_AUDIT.md) — camera/viewer atmosphere parity + device QA.  
[MEDIA_0_2C_POST_REFRESH_AUDIT.md](./MEDIA_0_2C_POST_REFRESH_AUDIT.md) — post/hide/delete local refresh (KN-01+).  
[MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) — **operational behavior matrix** (refresh, expiry, QA safe/not-safe).

---

## 9. Related docs

- [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md) — findings 1–3 audit
- [DEVICE_QA_PARITY_CHECKLIST.md](./DEVICE_QA_PARITY_CHECKLIST.md) — checkbox list
- [VP2_STABILIZATION_INVENTORY.md](./VP2_STABILIZATION_INVENTORY.md) — drift register
- [MAP_SHELL_DRIFT_AUDIT.md](./MAP_SHELL_DRIFT_AUDIT.md) — map atmosphere
- [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) — phase gates
