# Media system status — Moments & Shares (canonical audit)

**Date:** 2026-05-18  
**Purpose:** Single source of truth for **what is migrated vs scaffolded vs broken** on native before VP-2 signoff.  
**Authority:** `apps/web` (PWA) for product semantics; this doc for **native implementation truth**.

**Rendering / layout (2026-05-18):** [MEDIA_ARCHITECTURE_AUDIT.md](./MEDIA_ARCHITECTURE_AUDIT.md) · [INTENCITY_MEDIA_DOCTRINE.md](./INTENCITY_MEDIA_DOCTRINE.md) · [MEDIA_DRIFT_REGISTER.md](./MEDIA_DRIFT_REGISTER.md)

**Classification legend**

| Tag | Meaning |
|-----|---------|
| **A** | Intentionally deferred (named later phase) |
| **B** | Partially migrated (some paths work) |
| **C** | Parity drift (works but wrong UX/semantics vs PWA) |
| **D** | Broken (crash, silent fail, corrupt state) |
| **E** | Blocked by native infra (permissions, dev client, modules) |
| **F** | Blocked by later phase (realtime, GPS, notifications) |
| **✅** | Parity-stable for current scope |

---

## Executive summary

Native media is **split-brain**:

| Plane | Status |
|-------|--------|
| **Viewing / reads** | Largely **B/✅** — hub rail, viewer, feed, detail, archive, rings, `story_views` |
| **Creation / capture** | **B** — **MEDIA-0.2A** live `expo-camera` + PWA chrome; filter bake + post-shutter crop still **MEDIA-1** |
| **Social writes (shares)** | **B** — likes, comments, hide, delete on hub + detail; **no** notifications from writes |
| **Docs vs code** | **Drift** — `MIGRATION_PHASES.md` strict VP-2 says “no camera / no writes”; README says “no upload”; code **does** upload + interact |

**VP-2 signoff implication:** Treat **viewing + honesty** as in-scope for VP-2. Treat **full media creation parity** as **post–VP-2 (`MEDIA-1`)**. Treat **library crash** as **P0 blocker** even if creation is deferred (must not hard-crash).

---

## Gate conflict (must resolve for signoff)

| Document | Says |
|----------|------|
| [MIGRATION_PHASES.md](./MIGRATION_PHASES.md) VP-2 strict | **No** camera, **no** new `.from()`, **no** writes (beyond auth) |
| [apps/mobile/README.md](../apps/mobile/README.md) | “no capture/upload pipeline”; lists `story_likes` / `story_comments` writes |
| **Code (2026-05-18)** | `uploadStoryMedia.ts`, `StoryComposerModal`, hub share mutations, comments sheet |

**Truth:** A **partial MEDIA slice** landed in native (reads + selective writes + library upload) **without** updating the VP-2 gate line. Signoff should use **this doc**, not the stale “no writes” line alone.

**Recommended gate language (product):**

- **VP-2:** Viewing, rings, archive, feed/detail **read paths**, share **interaction**, **camera/viewer atmosphere** ([MEDIA_0_2A_PARITY_AUDIT.md](./MEDIA_0_2A_PARITY_AUDIT.md)).
- **MEDIA-1 (next):** Post-shutter crop (`react-easy-crop` parity), filter bake on export, `/shares/new` page, profile avatar upload, hub postgres RT.

---

## Creation vs viewing matrix

| Capability | PWA | Native | Class |
|------------|-----|--------|-------|
| Hub moments rail (read) | ✅ | ✅ | ✅ |
| Story viewer (fullscreen) | ✅ | ✅ | ✅ |
| `story_views` read/write | ✅ | ✅ | ✅ |
| Hub shares feed (read) | ✅ | ✅ | ✅ |
| Share post detail `/moments/[id]` | ✅ | ✅ | ✅ |
| Profile shares grid | ✅ | ✅ | ✅ |
| Profile archive grid | ✅ | ✅ | ✅ |
| Hidden shares `/archive/hidden` | ✅ | ✅ | B (restore/delete) |
| Hub share like/comment | ✅ | ✅ | B |
| **Live camera capture** | ✅ `getUserMedia` | ✅ `expo-camera` | **B** — device DU after rebuild |
| **Crop + zoom stage** | ✅ `react-easy-crop` | Library `allowsEditing`; camera → preview direct | **B** |
| **Filters** | ✅ 6 looks baked | Rail UI only (Normal uploads) | **B** |
| **Gallery pick** | ✅ file input | ✅ `launchImageLibraryAsync` | **B** |
| **Upload + insert `stories`** | ✅ | ✅ same payload shape | **B** |
| **CTA label “Camera — moment”** | Opens camera modal | Opens camera modal | **✅** |
| `/shares/new` dedicated page | ✅ full camera page | Redirect → composer | **C** |
| Share captions on post | ❌ (none in PWA upload) | ❌ | ✅ N/A |
| Avatar upload on profile edit | ✅ web | ❌ disabled UI | **A** |
| Notifications on story_like | ✅ | ❌ | **F** |
| Hub postgres refresh on post | ✅ realtime + event | `storyEpoch` refetch only | **F** / **A** |

---

## MOMENTS (ephemeral story system)

| Subsystem | PWA reference | Native | Status | Notes |
|-----------|---------------|--------|--------|-------|
| Active/inactive filter | `momentWindow.ts`, hub `hasActiveStoryMedia` | `fetchActiveMoments.ts`, `isMomentStillActive` | ✅ | |
| Hub rail (active friends only) | `friendStoryGroups` | `friendMomentGroups` | ✅ | Fixed 2026-05-17 |
| Glow rings (none/seen/unseen) | `story_views` + `StoryRing active` | `storyRingState.ts`, `StoryRing` | ✅ | Three-state 2026-05-17 |
| Story viewer modal | `StoryViewerModal.tsx` | `StoryViewerModal.tsx` | **✅** | MEDIA-0.2A gradients + progress; minor likes-on-moments drift |
| `recordStoryView` | `storyViews.ts` | `storyViews.ts` + `storyViewEvents` | ✅ | |
| Viewer auto-advance | timer + tap | timer + tap | ✅ | No cross-user queue (PWA same) |
| Story deletion (owner) | viewer + detail | `deleteHubShare` | **B** | Works for moments via same delete |
| Archive (expired) | `ProfileStoriesGrid` archive | `fetchProfileArchive` | ✅ | |
| **Camera launch** | `getUserMedia` in `StoryCameraModal` | `expo-camera` `CameraView` | **B** | [MEDIA_0_2A](./MEDIA_0_2A_PARITY_AUDIT.md) |
| **Take photo button** | Shutter in live preview | Shutter in live preview | **✅** | |
| **Gallery picker** | File input → crop | `launchImageLibraryAsync` + editing | **B** | |
| **Permissions** | Browser prompt | Camera + library hooks | **B** | Rebuild dev client |
| **Upload** | storage + insert | `uploadStoryFromUri` | **B** | Same semantics; `fetch(file://)` may fail on some paths |
| **Compression** | canvas JPEG 0.92 | picker `quality: 0.92` | **B** | No server-side recompress |
| **Post refresh** | `story-posted` + RT | `bumpStoryEpoch` (hub, feed, profile grids, archive) | **B** | No hub RT; local invalidation **✅** MEDIA-0.2C |
| Optimistic ring after post | event + refetch | epoch refetch | **B** | |
| Expiration handling | client filter | client filter | ✅ | |
| Create tab route | `/stories` / composer event | `create.tsx` → composer | **C** | IA ok; capability not |

---

## SHARES (feed/post system)

| Subsystem | PWA reference | Native | Status | Notes |
|-----------|---------------|--------|--------|-------|
| Hub feed hydration | `loadHubFriendShares` | `fetchHubFeedPreview` | ✅ | |
| Feed card UI | `HubShareFeedCard` | `HubShareFeedCard` | **B** | Visual VP-2 pass ongoing |
| Like toggle | `story_likes` | `toggleHubShareLike` | ✅ | |
| Comments sheet | `ShareCommentsBottomSheet` | `ShareCommentsBottomSheet` | **B** | Read/write; no realtime |
| Comment send | insert `story_comments` | insert | ✅ | |
| Comment delete | delete | delete | ✅ | |
| Liked-by friends line | `fetchLikedByFriendsLineForStory` | same | ✅ | |
| Detail page | `moments/[id]/page.tsx` | `MomentDetailScreen` | **B** | Share branch strong; archive view ok |
| Profile shares grid | `ProfileStoriesGrid` shares | `fetchMyProfileShares` | ✅ | |
| Hide from grid | `share_hidden` | `toggleHubShareHidden` | ✅ | |
| Delete share | delete row | `deleteHubShare` | ✅ | |
| Hidden shares archive | `/archive/hidden` | `/archive-hidden` | ✅ | |
| **Create share flow** | camera + crop + post | library + post via composer | **B/C/D** | Not dedicated page |
| **Captions** | none on upload | none | ✅ | |
| `/shares/new` | standalone camera page | deep link → composer sheet | **C** | |
| Public profile shares grid | `/u` | `PublicProfileScreen` partial | **B** | Shares when visible |

---

## Camera / library crash — root cause audit

### Observed (device QA)

- Opening photo library can **hard crash**
- No take-picture affordance (expected — native has no camera path)
- Layout unlike PWA live camera + crop stages

### Native code path

```
CreateComposerSheet → StoryComposerModal.pickImage()
  → ImagePicker.requestMediaLibraryPermissionsAsync()
  → ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect })
  → (optional) uploadStoryFromUri → fetch(localUri).blob() → supabase.storage.upload → stories.insert
```

Files: `StoryComposerModal.tsx`, `uploadStoryMedia.ts`, `CreateComposerProvider.tsx`

### Likely crash causes (ranked)

| # | Cause | Evidence | Class |
|---|--------|----------|-------|
| 1 | **Missing iOS privacy strings** | `ios/Intencity/Info.plist` has **no** `NSPhotoLibraryUsageDescription` / `NSPhotoLibraryAddUsageDescription`; `app.config.ts` plugins list **does not** include `expo-image-picker` | **E** → **D** |
| 2 | **Stale native project vs deps** | `expo-image-picker` in `package.json` + Podfile.lock but plist not regenerated via prebuild | **E** |
| 3 | **Unhandled rejection** | `pickImage()` has **no** `try/catch` around `launchImageLibraryAsync` | **D** |
| 4 | **`fetch(file://)` blob on upload** | `uploadStoryFromUri` uses `fetch(localUri)` — can throw on some RN/Hermes paths | **D** |
| 5 | **Expo Go vs dev client** | Mapbox already requires dev client; image picker usually works in both **if** plist correct | Verify on device |
| 6 | **New Architecture** | `newArchEnabled: true` — rare picker edge cases | **E** (investigate if persists after plist) |

### Is the flow placeholder or real?

**Partially wired, not placeholder.** UI presents “Open library” + “Post” and performs real storage + DB insert when the path succeeds. It is **not** safe to call production-ready.

### MEDIA-0.1 stabilization ✅ (2026-05-18)

See [MEDIA_0_1_STABILIZATION.md](./MEDIA_0_1_STABILIZATION.md).

1. ✅ `expo-image-picker` plugin + iOS plist strings
2. ✅ try/catch picker + upload + Alerts
3. ✅ Honest CTA **“Choose photo — *”** (PWA uses “Camera” only because live camera exists)
4. **Rebuild dev client required** to pick up plist changes

---

## What should work in VP-2 vs later phases

### Should work for VP-2 signoff (viewing + honesty)

- Hub moments rail semantics (active-only, rings)
- Story viewer open/close/advance + view recording
- Hub shares feed read + navigation to detail
- Share like/comment/hide/delete on **existing** content
- Profile/archive/hidden grids **read** (+ owner restore/delete on hidden)
- No fake live presence on map/hub
- **No hard crash** when user hits create flow (either fix or disable entry)

### Belongs to MEDIA-1+ (not VP-2 complete)

- Live camera + flip + shutter
- Full crop stage parity (pinch/zoom)
- Filter pipeline
- `/shares/new` full-page parity
- Profile avatar upload
- `story-posted` + hub realtime invalidation
- Notifications for story interactions
- Compression pipeline parity

### Blocked by other phases

| Item | Blocker |
|------|---------|
| Hub “Active friends” on moments | P2O-C presence |
| Venue on moment | optional / later |
| Chat from share notification | REALTIME-1 + notifications |

---

## PWA reference map

| System | Primary PWA files |
|--------|-------------------|
| Moments viewer | `components/StoryViewerModal.tsx` |
| Moments/shares capture | `components/StoryCameraModal.tsx`, `components/AppShell.tsx` (composer sheet) |
| Share page | `app/shares/new/page.tsx` |
| Hub feed | `app/hub/page.tsx` (`loadHubStories`, `loadHubFriendShares`) |
| Post detail | `app/moments/[id]/page.tsx` |
| Profile grids | `components/ProfileStoriesGrid.tsx`, `app/profile/page.tsx` |
| Archive hidden | `app/archive/hidden/page.tsx` |
| View tracking | `lib/storyViews.ts` |
| Expiry | `lib/momentWindow.ts` |
| Comments | `components/ShareCommentsBottomSheet.tsx` |

---

## Recommended path before VP-2 signoff

1. **Product decision (30 min):** Confirm VP-2 includes **viewing + share interactions**, excludes **full camera parity**.
2. **Crash policy:** Either **MEDIA-0.1 hotfix** (permissions + try/catch) or **disable** FAB/composer with honest copy until MEDIA-1 — **never** ship crashy path.
3. **Doc alignment:** Update `MIGRATION_PHASES.md` VP-2 bullet to match this doc (reads + bounded writes; not full camera).
4. **Device QA:** Run [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md) **plus** media matrix §Creation vs viewing.
5. **Do not start P2O-B** until VP-2 signed and media crash/honesty resolved.

---

## MEDIA-0.2C (2026-05-18)

**Post/hide/delete local refresh:** [MEDIA_0_2C_POST_REFRESH_AUDIT.md](./MEDIA_0_2C_POST_REFRESH_AUDIT.md)

- `bumpStoryEpoch` mirrors PWA `story-posted` across hub, profile grids, archive, hidden shares.
- Profile shares/archive prefetch on epoch (no tab-switch required).
- Hub hide/delete + detail hide/delete bump epoch.
- Viewer **close** no longer bumps epoch (views use `subscribeStoryViewed`).

---

## MEDIA-0.2A (2026-05-18)

**Camera/viewer atmosphere parity:** [MEDIA_0_2A_PARITY_AUDIT.md](./MEDIA_0_2A_PARITY_AUDIT.md)

- Native: edge-to-edge `StoryComposerModal`, canonical `StoryCameraSurface`, `expo-camera` plugin.
- PWA: `streamReady` gating — fixes unavailable overlay over live feed during flip.
- Hub shares feed refetches on `storyEpoch` (KN-01).

---

## Operational matrix (VP-2 signoff)

**Full subsystem-by-subsystem behavior, refresh rules, optimistic vs DB, QA safe/not-safe:**

→ **[MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md)**

---

## Related audits

- [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md)
- [VP2_STORY_RING_PARITY_AUDIT.md](./VP2_STORY_RING_PARITY_AUDIT.md)
- [VP2_HUB_PROFILE_PARITY_AUDIT.md](./VP2_HUB_PROFILE_PARITY_AUDIT.md)
- [VP2_DEVICE_QA_SIGNOFF.md](./VP2_DEVICE_QA_SIGNOFF.md)
- [PWA_NATIVE_PARITY_AUDIT.md](./PWA_NATIVE_PARITY_AUDIT.md) §11 / §24
