# MEDIA-1 — interactive crop + profile avatar (Era 1 Mirror)

**Date:** 2026-05-26  
**PWA reference:** `StoryCameraModal` crop stage, `/profile/edit` avatar upload

---

## Shipped

| Feature | Native |
|---------|--------|
| **Moment interactive crop** | Library + camera → `moment-crop` (`ShareCropStage` mode `story`, 9:16) → preview → post |
| **Share crop** | Unchanged — `share-crop` with portrait / square picker |
| **Profile avatar** | Pick library → square crop → `avatars` bucket + `profiles.avatar_url` |
| **Crop windows** | `storyCropWindowSize`, `avatarCropWindowSize` in `mediaLayout.ts` |

## Files

- `apps/mobile/src/components/create/ShareCropStage.tsx` — `CropStageMode` (`share` \| `story` \| `avatar`)
- `apps/mobile/src/components/create/StoryComposerModal.tsx` — `moment-crop` surface
- `apps/mobile/src/lib/storyCameraSurface.ts` — `moment-crop`
- `apps/mobile/src/lib/uploadProfileAvatar.ts`
- `apps/mobile/app/(app)/profile-edit.tsx`

## Deferred (Era 2+ or MEDIA-1.1)

- **Look filters** (MD-107) — PWA bakes 6 filters on canvas; native rail not wired
- **`/shares/new` dedicated route** — composer modal remains entry (MD-307)
- **Native `createNotification`** on like/comment — **NOTIF-2** with cutover
- **Hub postgres RT** on post — `storyEpoch` refetch only

## QA

1. **Moment:** Create → camera or library → drag/zoom crop → Your story → hub ring updates
2. **Share:** Create share → portrait/square crop → preview → post → hub feed
3. **Avatar:** Profile → Edit → tap photo → crop → save; tab bar avatar updates after back
4. Deny photo permission → Alert, no crash
5. Airplane mode avatar upload → error message, no crash

## Device note

Requires **dev client** rebuild only if native deps changed; this slice is JS-only.
