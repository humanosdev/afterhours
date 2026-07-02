# VP-2 stabilization inventory (final)

**Date:** 2026-05-17  
**Gate:** VP-2 sign-off → `SYSTEM_TRUTH_AUDIT.md` → device QA → **P2O-B blocked** until complete.

This is the consolidated drift register across auth, social surfaces, map shell, and navigation — **not** a feature backlog for P2O.

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Shipped / stable for VP-2 |
| ⏸ | Intentionally deferred (named phase) |
| ⚠️ | Known drift — document or fix before sign-off |
| 🔍 | Requires device QA confirmation |

---

## 1. Auth & session

| Item | Status | Notes |
|------|--------|-------|
| Signup / login / forgot / reset | ✅ | Code-first errors; `AUTH_FAILURE_AUDIT.md` |
| Email quota semantics | ✅ | `over_email_send_rate_limit` truthful copy |
| Onboarding routing | ✅ | `onboarding_complete` gate |
| Legal consent API | ⏸ | U5 — web `POST /api/legal/consent` |
| Deep link reset | 🔍 | Supabase redirect allow list + dev client |

---

## 2. Chat (READ-SOCIAL-1)

| Item | Status | Notes |
|------|--------|-------|
| Read-only message history | ✅ | `fetchChatThread.ts` |
| Bubble layout / tap timestamps | ✅ | PWA parity |
| Disabled send composer | ✅ | **Not a bug** — REALTIME-1 |
| Empty transcript (no placeholder card) | ✅ | Stale Metro was false alarm |
| Realtime / seen / typing | ⏸ | REALTIME-1 |
| Delete-for-me (localStorage) | ⏸ | Optional |

---

## 3. Friends & discovery (READ-SOCIAL-2)

| Item | Status | Notes |
|------|--------|-------|
| Friends local search | ✅ | `filterFriendsLocal` |
| Discovery friends-first search | ✅ | `runDiscoveryPeopleSearch` |
| FoF suggestions | ✅ | No presence required |
| Status pills (read-only) | ✅ | `DiscoveryPeopleTrailing` |
| Trending places live rank | ⏸ | Honest catalog until P2O-C |
| Friend request actions on roster | ⏸ | Writes |
| Active friends + presence subtitles | ⏸ | P2O-C |

---

## 4. Map shell (atmospheric)

| Item | Status | Notes |
|------|--------|-------|
| Full-bleed + overlay stack | ✅ | |
| Top inset 30px | ✅ | `MAP_TOP_OVERLAY_GAP_PX` |
| Checkpoint 460px / nav 44px | ✅ | |
| Sheet 74svh / hero 168px | ✅ | |
| Friends panel 112px right | ✅ | Already matched |
| Sheet scrim | ✅ removed | PWA undimmed city; dismiss via close |
| Night map chrome | ⏸ | PWA auto day/night |
| Heat / GPS / presence on map | ⏸ | P2O-B / P2O-C |

See [MAP_SHELL_DRIFT_AUDIT.md](./MAP_SHELL_DRIFT_AUDIT.md).

---

## 5. Media / Moments / Shares

**Canonical:** [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md)

| Item | Status | Notes |
|------|--------|-------|
| Moments viewing (rail, viewer, views, rings) | ✅ | VP-2 in scope |
| Shares feed + detail + interactions | ✅ / B | Likes/comments/hide/delete work |
| Profile/archive/hidden grids | ✅ | |
| **Media creation (camera)** | ✅ **MEDIA-0.2A** | Live `expo-camera` + PWA chrome — **rebuild dev client** |
| **Library picker + upload** | ✅ **MEDIA-0.1** | try/catch + permissions |
| **Camera/viewer atmosphere** | ✅ **MEDIA-0.2A** | [MEDIA_0_2A_PARITY_AUDIT.md](./MEDIA_0_2A_PARITY_AUDIT.md) |
| Post-shutter crop + filter bake | ⏸ **MEDIA-1** | Rail UI present; export bake deferred |
| **Post/hide/delete local refresh** | ✅ **MEDIA-0.2C** | [MEDIA_0_2C_POST_REFRESH_AUDIT.md](./MEDIA_0_2C_POST_REFRESH_AUDIT.md) |

**VP-2 blocker:** Media crash — **MEDIA-0.1 shipped**; confirm on device ([MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md)).

---

## 6. Hub / profile / misc surfaces

| Item | Status | Notes |
|------|--------|-------|
| Hub moments rail (active-only) | ✅ | [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md) Finding 2 |
| Hub shares feed | ✅ | Read + like/comment/hide |
| Story viewer modal | ✅ | In-group advance; hub RT refresh deferred |
| Profile archive grid | ✅ | `fetchProfileArchive` — Finding 3 |
| Tab bar profile avatar stability | ✅ | Cache + overlay ring — Finding 1 |
| Story ring glow semantics | ✅ | [VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md) Finding 4 |
| Map friends panel copy | ✅ | No fake “Nearby”; ghost read-only |
| Public profile grids | ⚠️ | Shares read; archive owner-only on web |
| Notifications / settings | ⏸ | Placeholder shells |
| Venue activity / live places | ⏸ | Honest partial data |

---

## 7. Navigation & shell

| Item | Status | Notes |
|------|--------|-------|
| Floating tab bar metrics | ✅ | `tabBarMetrics.ts` |
| Stack routes (`chat/[id]`, etc.) | ✅ | Explicit stack screens |
| Keyboard / safe area (auth, search) | 🔍 | Device QA |
| Scroll restoration | 🔍 | Per-screen |
| Deep link `venueId` on map | ✅ | Query param opens sheet |

---

## 8. Cross-surface QA findings (template)

_Use [DEVICE_QA_PARITY_CHECKLIST.md](./DEVICE_QA_PARITY_CHECKLIST.md) on device; record below._

| Surface | Pass | Fail | Notes |
|---------|------|------|-------|
| Auth cold start | | | |
| Chat thread populated | | | |
| Friends search | | | |
| Map shell spacing | | | |
| Tab / stack back | | | |

---

## 9. Recommended fixes before VP-2 sign-off

**Must verify on device (no code):**
1. Metro `--clear` after any native JS change
2. Chat build marker `READ-SOCIAL-1-thread-v2`
3. Map top spacing + sheet height vs PWA screenshot

**Optional polish (if QA fails):**
- Map skeleton if we add map loading state later
- Sheet drag-dismiss (PWA) — interaction slice post–VP-2

**Do NOT do before sign-off:**
- Enable send / subscriptions
- Add `user_presence` or GPS
- Fake live counts or heat

---

**Media (before signoff):**
- Run [MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md) device QA after **native rebuild**
- Do **not** claim camera parity in VP-2

## 10. P2O-B gate (unchanged)

Blocked until:
- [ ] This inventory reviewed
- [ ] Device QA checklist executed
- [ ] `MIGRATION_PHASES.md` VP-2 sign-off line checked
- [ ] No UNK on in-scope semantics in `SYSTEM_TRUTH_AUDIT.md`

---

## 10. Signoff recommendation (2026-05-17)

**Engineering posture:** Native is ready for **formal device QA**, not yet for **VP-2 signed** or **P2O-B**.

| Gate | Status |
|------|--------|
| Semantic lies removed (auth, map friends, live places) | ✅ |
| Social read surfaces (chat, friends, discovery) | ✅ code-complete |
| Map atmospheric pass | ✅ code-complete; **device confirm** |
| Cross-surface cohesion | 🔍 **you** run [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) |
| Media creation crash / honesty | ✅ MEDIA-0.1 — device confirm |
| P2O-B | **BLOCKED** |

---

## Related docs

- [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) — **primary QA runbook**
- [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md)
- [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md)
- [AUTH_FAILURE_AUDIT.md](./AUTH_FAILURE_AUDIT.md)
- [CHAT_THREAD_PARITY_AUDIT.md](./CHAT_THREAD_PARITY_AUDIT.md)
- [FRIENDS_SEARCH_PARITY_AUDIT.md](./FRIENDS_SEARCH_PARITY_AUDIT.md)
- [DEVICE_QA_PARITY_CHECKLIST.md](./DEVICE_QA_PARITY_CHECKLIST.md)
