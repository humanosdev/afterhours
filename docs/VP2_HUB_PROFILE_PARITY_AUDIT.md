# VP-2 Hub / Profile parity audit (device QA findings)

**Date:** 2026-05-17  
**Scope:** Findings 1–3 from VP-2 device QA — parity/cohesion only. **No** GPS, realtime subscriptions, or fake live semantics.

**Authority:** `apps/web` PWA is source of truth.

---

## Summary

| # | Issue | Classification | VP-2 action |
|---|--------|----------------|-------------|
| 1 | Profile tab avatar flicker | **Parity bug** (native polish) | ✅ Fixed — profile cache + stable tab avatar |
| 2 | Hub moments rail shows all friends | **Parity bug** (semantic drift) | ✅ Fixed — active-moment filter |
| 3 | Profile archive empty | **Partial implementation** | ✅ Fixed — archive read mirrors PWA |

---

## Finding 1 — Profile tab avatar flicker

### Observed (native)

- Bottom-nav profile avatar briefly shows black/fallback when opening Profile (especially after tab idle).
- Then hydrates correctly → feels unstable.

### PWA reference

| File | Behavior |
|------|----------|
| `apps/web/src/components/BottomNav.tsx` L27–51 | Loads `avatar_url` once on mount into `profileAvatarUrl` state; **keeps until remount** |
| L129–140 | Renders `<img src={profileAvatarUrl}>` when URL exists; **no** swap to generic User icon after first load |

PWA does **not** use a shared global profile store, but SPA shell rarely remounts BottomNav → perceived persistence.

### Native root cause

| Issue | Detail |
|-------|--------|
| No shared profile cache | Each `useMyProfile()` instance refetched independently |
| Tab bar branch | `FloatingTabBar.tsx` swapped `TabBarProfileAvatar` ↔ Lucide `User` when `avatarUrl` briefly null |
| Active ring remount | `TabBarProfileAvatar` used **different component trees** for active vs idle (black `ring-offset` box remounted `Image`) |

### Classification

- **VP-2 fix now** — cohesion/polish, no new backend.

### Fix shipped

- `src/lib/myProfileCache.ts` — module cache keyed by `userId`
- `useMyProfile` — hydrate from cache; avoid loading flash when cached
- `useMyAvatar` — `lastAvatarRef` retains last good URI across refetch
- `TabBarProfileAvatar` — single `Image` mount; active ring as overlay (no black offset box)
- `FloatingTabBar` — `showProfileAvatar` gate (sticky once avatar known)

### Deferred

- Avatar **upload** on edit profile (honest copy already on edit screen)
- AsyncStorage disk cache across cold start (optional polish)

---

## Finding 2 — Hub moments rail semantic drift

### Observed (native)

- Rail listed **every accepted friend** with avatar rings.
- PWA lists **only friends with active (non-expired) moments** with media.

### PWA reference

| File | Lines | Semantics |
|------|-------|-----------|
| `apps/web/src/app/hub/page.tsx` | `loadHubStories` L437–455 | Fetch `stories` for friend ids; filter `!is_share`, `media_url`, `isMomentStillActive` |
| | L637–677 | `groupedStories` → `validGroupedStories` (drop empty groups) |
| | L674–676 | `friendStoryGroups` = groups excluding self |
| | L1027–1046 | Rail maps **`friendStoryGroups` only** |
| | L651–655, L733–735 | `hasActiveStoryMedia` — ring active only when unseen active media |
| | L997–1003 | Own slot: viewer if active story, else composer |

| File | Semantics |
|------|-----------|
| `apps/web/src/lib/momentWindow.ts` | `isMomentStillActive` — 24h cap + `expires_at` min |
| `apps/web/src/components/StoryViewerModal.tsx` | Per-user group; in-group auto-advance via progress timer |

### Native before fix

| File | Drift |
|------|-------|
| `apps/mobile/app/(app)/(tabs)/hub.tsx` L168–192 | `friends.map` — **roster-driven** rail |
| `fetchActiveMomentsByUserIds` | Correct active filter existed but **not used to hide cells** |

### Classification

| Item | Verdict |
|------|---------|
| Filter rail to active moments only | **VP-2 fix now** ✅ |
| Sort by latest story (recency) | **VP-2 fix now** ✅ |
| Unseen ring via `story_views` | Already wired — **VP-2** ✅ |
| Hub `postgres_changes` refresh | **Deferred** — REALTIME-1 / hub refresh slice (PWA has it; not required for honest static read) |
| Cross-friend viewer queue (tap through all friends) | **Not in PWA** `StoryViewerModal` — N/A |
| Story capture / post pipeline | **Deferred** — media slice |

### Fix shipped

- `friendMomentGroups` — friends with `stories.length > 0`, sorted by latest `created_at`
- Skeleton until `momentsLoading` completes (avoid roster flash)
- Removed dead “tap friend with no story → profile” path from rail (PWA never shows those cells)

---

## Finding 3 — Story archive parity

### Observed (native)

- Profile **Archive** tab always empty copy despite expired moments on PWA.

### PWA reference

| File | Semantics |
|------|-----------|
| `apps/web/src/components/ProfileStoriesGrid.tsx` L88–103 | **Archive mode (owner only):** `isExpiredMoment` OR (`isShare && shareHidden`) |
| | L94–97 | Expired = non-share AND `expires_at` (or created+24h) ≤ now |
| L168 | Navigate `/moments/[id]?view=archive` |
| `apps/web/src/app/profile/page.tsx` L565–578 | Archive tab uses `ProfileStoriesGrid` `mode="archive"` |
| `apps/web/src/app/archive/hidden/page.tsx` | Separate route for **hidden shares** management (restore/delete) |

### Native before fix

| File | State |
|------|-------|
| `ProfileTabGrid.tsx` Archive branch | **Hardcoded** `ProfileEmpty` — no fetch (**partial implementation**) |
| `archive-hidden.tsx` | Hidden shares route exists (separate from archive grid) |
| `fetchMomentDetail.ts` + `moments/[id]?view=archive` | Archive **detail** read path ✅ |

### Classification

| Item | Verdict |
|------|---------|
| Archive grid fetch + filter | **VP-2 fix now** ✅ (read-only `stories`, approved table) |
| Hidden shares grid | **Already routed** `/archive-hidden` — verify on device |
| Public profile archive tab | PWA owner-only — native `PublicProfileScreen` unchanged (correct) |

### Fix shipped

- `src/lib/fetchProfileArchive.ts` — mirrors `ProfileStoriesGrid` archive filter
- `ProfileTabGrid` — grid + timestamp overlay + deep link `view=archive`

### Blocked / deferred

- Archive **realtime** refresh on new expiry — poll/event slice post–VP-2
- Owner delete/restore from archive grid — write slice (detail screen owner actions partial)

---

## P2O-B blockers (unchanged)

These findings do **not** block P2O-B directly once device QA passes, but **VP-2 sign-off** should confirm:

- [ ] Tab avatar stable across tab switches (Finding 1)
- [ ] Hub rail only active friends (Finding 2)
- [ ] Archive shows expired moments + hidden shares in grid (Finding 3)

---

## Related docs

- [VP2_STABILIZATION_INVENTORY.md](./VP2_STABILIZATION_INVENTORY.md)
- [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md)
- [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) §11 Hub / Profile
- [SYSTEM_TRUTH_AUDIT.md](./SYSTEM_TRUTH_AUDIT.md) § Stories & moments (social UI)
