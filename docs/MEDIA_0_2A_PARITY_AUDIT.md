# MEDIA-0.2A — PWA camera/viewer atmosphere parity audit

**Date:** 2026-05-18  
**Scope:** Exact parity pass for **live camera chrome**, **viewer atmosphere**, and **canonical camera surface state** — not MEDIA-1 feature expansion.

---

## Executive summary

| Area | Before | After MEDIA-0.2A |
|------|--------|------------------|
| Native composer | Boxed library scaffold (`marginHorizontal: 12`, rounded stage) | **Edge-to-edge** `expo-camera` + PWA chrome layout |
| Native CTA | “Choose photo — *” | **“Camera — *”** (matches PWA `AppShell`) |
| Camera unavailable + feed | N/A on native; **PWA race** could show stale video during flip | **Mutually exclusive surfaces** (`streamReady` on web; `StoryCameraSurface` on native) |
| Story viewer | Flat scrim, all-accent progress | **PWA gradients** + white past / violet active progress |
| Hub share feed after post | No `storyEpoch` refetch | **Fixed** — `useHubFeedPreview(..., storyEpoch)` |

**Device requirement:** Rebuild dev client after `expo-camera` plugin (`npx expo run:ios` / `run:android`). Metro-only reload is **not** enough for camera native module.

---

## Side-by-side: camera chrome

| Element | PWA `StoryCameraModal` | Native `StoryComposerModal` (0.2A) | Class |
|---------|------------------------|-------------------------------------|-------|
| Root layout | `fixed inset-0 bg-black` | `Modal` fullScreen, no horizontal inset | **✅** |
| Live feed | `<video object-contain>` | `CameraView` full bleed | **✅** |
| Top scrim | `h-36 from-black/75` gradient | `LinearGradient` 144px | **✅** |
| Bottom scrim | `h-[min(55%,22rem)]` gradient | `LinearGradient` ~55% max 352px | **✅** |
| Close control | 44px glass circle, safe+8 | 44px `GlassSurface` control | **✅** |
| Title chrome | “NEW MOMENT” pill + Intencity | Same structure | **✅** |
| Flip | `RotateCcw` when live | Same, disabled when not `live` | **✅** |
| Shutter | 76px ring / 54px inner | 76/54 match | **✅** |
| Library btn | 52px left absolute | 52px left absolute | **✅** |
| Filter rail | 6 chips, glass tray | Same labels (`storyLookFilters.ts`) | **B** — UI only; **no filter bake** on upload yet |
| Capture → crop | `react-easy-crop` stage | Library: `allowsEditing`; camera: **direct preview** | **B** |
| Unavailable UI | Center card, library CTA | Same copy; **only when `surface === 'unavailable'`** | **✅** |
| Post labels | Your story / Share | Same | **✅** |

---

## Camera semantic state audit

### Native (`storyCameraSurface.ts`)

| Surface | Renders | Cannot coexist with |
|---------|---------|---------------------|
| `starting` | Black fill | live / unavailable / preview |
| `live` | `CameraView` only | unavailable card |
| `unavailable` | Fallback card + library CTA | `CameraView` |
| `preview` | `Image` contain | live feed |

**Rule:** “Camera unavailable” copy is **impossible** while `CameraView` is mounted.

### PWA (`StoryCameraModal.tsx`)

| Flag | Meaning |
|------|---------|
| `cameraUnavailable` | Permission / API failure — show card |
| `streamReady` | `getUserMedia` + `video.play()` succeeded — show `<video>` |
| `starting` | Flip/reopen in progress — show **black**, not unavailable |

**Bug fixed:** Previously `<video>` could render while `cameraUnavailable` was being toggled during camera flip; unavailable card and last frame could appear together. Video now renders **only** when `streamReady`.

---

## Story viewer atmosphere

| Element | PWA | Native 0.2A | Class |
|---------|-----|-------------|-------|
| Media | `object-cover` full bleed | `cover` absolute fill | **✅** |
| Top scrim | `h-24 from-black/55` | `LinearGradient` 96px | **✅** |
| Progress past | `bg-white` | `progressFillPast` white | **✅** |
| Progress current | `bg-accent-violet-active` + glow | `progressFillActive` accent + shadow | **✅** |
| Footer | gradient + border-t | `LinearGradient` footer | **✅** |

---

## Classification update (post 0.2A)

| Capability | Class | Works in code | Works on device | Like PWA |
|------------|-------|---------------|-----------------|----------|
| Live camera | **B** | ✅ | **DU** (rebuild) | **B** (no interactive crop on shutter path) |
| Edge-to-edge chrome | **✅** | ✅ | DU | ✅ |
| Filter rail | **B** | UI ✅ / bake ❌ | DU | **C** |
| Library pick + crop | **B** | ✅ | DU | ✅ |
| Viewer atmosphere | **✅** | ✅ | DU | ✅ |
| Unavailable semantics | **✅** | ✅ | DU | ✅ |
| Hub feed after share post | **✅** | ✅ | DU | **B** (no postgres RT) |

**Still MEDIA-1 (deferred):** Interactive crop after shutter (`react-easy-crop` parity), filter bake on export, `/shares/new` dedicated page, avatar upload.

---

## QA checklist (MEDIA-0.2A)

1. Rebuild native dev client.
2. Create → Camera — moment → **full-bleed** preview, shutter, flip, library.
3. Deny camera → **only** unavailable card (no feed behind).
4. Allow camera → **no** “Camera unavailable” text.
5. Post moment → hub rail updates; post share → **hub feed updates** (KN-01 fixed).
6. Open story viewer → progress white/violet, gradient footer.

---

## Source files

| File | Change |
|------|--------|
| `apps/mobile/src/components/create/StoryComposerModal.tsx` | Full PWA layout + `expo-camera` |
| `apps/mobile/src/lib/storyCameraSurface.ts` | Surface enum |
| `apps/mobile/src/lib/storyLookFilters.ts` | Filter labels |
| `apps/mobile/src/content/mediaComposerCopy.ts` | PWA CTAs |
| `apps/mobile/app.config.ts` | `expo-camera` plugin |
| `apps/mobile/src/components/stories/StoryViewerModal.tsx` | Gradients + progress |
| `apps/mobile/src/hooks/useHubFeedPreview.ts` | `storyEpoch` refresh |
| `apps/web/src/components/StoryCameraModal.tsx` | `streamReady` gating |
