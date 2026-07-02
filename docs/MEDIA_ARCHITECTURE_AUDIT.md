# Native media architecture audit (current state)

**Date:** 2026-05-18 (audit) · **Updated post MEDIA-1**  
**Scope:** `apps/mobile` — current-state truth. Implementation: MEDIA-1 unified pass.  
**Authority:** Code in `apps/mobile`; PWA (`apps/web`) referenced for **semantic** comparison only (not modified).  
**Related:** [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md) (migration/classification), [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) (operational behaviors), [INTENCITY_MEDIA_DOCTRINE.md](./INTENCITY_MEDIA_DOCTRINE.md) (target architecture), [MEDIA_DRIFT_REGISTER.md](./MEDIA_DRIFT_REGISTER.md) (prioritized inconsistencies).

---

## Executive summary

Native media today is a **two-pipeline, single-asset** system:

| Pipeline | Ingest | Storage | Display primitive | Surfaces |
|----------|--------|---------|-------------------|----------|
| **Stories / shares** | `StoryComposerModal` → `uploadStoryFromUri` | Supabase `stories` bucket, one JPEG per post | `StoryMediaImage` (+ signed URLs) | Hub feed, viewer, grids, detail, archive |
| **Venues** | None (read-only URLs from API) | External / venue tables | `RemoteImage` | Map sheet, hub places rail, discovery |
| **Avatars** | **No upload** on native (profile edit stub) | `profiles.avatar_url` | `ProfileAvatar` / `TabBarProfileAvatar` | Everywhere |

There are **no derived image variants** (thumbnail, feed, blur). Every surface re-crops the **same full-resolution URL** with different layout boxes and `contentFit` rules. Inconsistency comes from **per-component layout math**, not from multiple backends.

---

## 1. Upload ingestion pipeline

### 1.1 Entry points

| Entry | File | Trigger |
|-------|------|---------|
| Create tab / hub CTA | `CreateComposerProvider.tsx` | Opens `StoryComposerModal` directly (skips `CreateComposerSheet`) |
| Mode | `ComposerMode`: `"moments"` \| `"shares"` | `uploadStoryMediaTypes.ts` |

Only one upload function: `uploadStoryFromUri()` in `lib/uploadStoryMedia.ts`.

### 1.2 Camera capture flow

**File:** `components/create/StoryComposerModal.tsx`  
**Deps:** `expo-camera` (`CameraView`, `useCameraPermissions`)

| Step | Behavior |
|------|----------|
| Open | `resetSession()` → `initCamera()` → surface `"live"` or `"unavailable"` |
| Live | Full-bleed `CameraView` (`mode="picture"`, `facing`, front `mirror`) |
| Shutter | `takePictureAsync({ quality: 0.92, skipProcessing: false, mirror: true if front })` |
| Preview | Surface `"preview"`; RN `Image` **`resizeMode="contain"`** (letterbox) |
| Post | `uploadStoryFromUri(previewUri, mode)` |

**Aspect at capture:** None. Device sensor aspect (~4:3 typical) is preserved through upload.

**Surface state machine:** `lib/storyCameraSurface.ts` — `"starting" | "live" | "unavailable" | "preview"`.

**Not wired:** `lib/storyLookFilters.ts` (PWA has filter bake in `StoryCameraModal`; native rail unused).

### 1.3 Library picker flow

```ts
ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  quality: 0.92,
  allowsEditing: true,
  aspect: mode === "shares" ? [4, 5] : [9, 16],
});
```

| Mode | Picker-enforced aspect | Matches PWA `cropAspect` |
|------|------------------------|---------------------------|
| `moments` | 9:16 | Yes |
| `shares` | 4:5 | Yes |

Crop happens **in the OS picker**, not in-app (`react-easy-crop` equivalent on web).

### 1.4 Normalization (`lib/normalizeStoryImage.ts`)

| Operation | Applied? |
|-----------|----------|
| Resize | **No** (`manipulateAsync` with `actions: []`) |
| Explicit EXIF rotate | **No** (implicit via manipulator only) |
| Format | Force **JPEG** (`SaveFormat.JPEG`) |
| Compression | **0.9** on re-encode |
| Extension | Copy to `cacheDirectory/story-{timestamp}.jpg` if needed |

On failure → `null` → upload uses **original URI bytes** (`readBytesWithFallback`).

### 1.5 Byte read (`lib/readLocalImageBlob.ts`)

| URI scheme | Strategy |
|------------|----------|
| `file://` | `FileSystem.readAsStringAsync` Base64 → `ArrayBuffer` (avoids iOS `fetch(file://)` failure) |
| `content://`, `ph://` | FileSystem first, XHR blob fallback |
| `http(s)://` | `fetch` → blob → `arrayBuffer` |

HEIC: inferred in `inferMimeType()` for logging; upload path always sends `contentType: "image/jpeg"`.

### 1.6 Storage + DB

| Field | Value |
|-------|--------|
| Bucket | `stories` |
| Object key | `{userId}-{timestamp}.jpg` |
| Persisted URL | `getPublicUrl(filePath).publicUrl` → `image_url` (+ `media_url` on insert) |
| Moment expiry | `expires_at` = now + 24h |
| Share expiry | `expires_at` = null |
| Share flags | `is_share`, `share_visible`, `share_hidden` |

**No** thumbnail generation, **no** resize at upload, **no** CDN transform params.

### 1.7 Display URL resolution (`lib/storyMediaUri.ts`)

1. Block local schemes (`file://`, `ph://`, `content://`).
2. Parse `stories` object path from public/sign URL.
3. Prefer `createSignedUrl(path, 3600)` for render (private-bucket safe).
4. Fallback to stored public URL.

**Prefetch** (`lib/prefetchStoryMedia.ts`): same `resolveStoryDisplayUri` → `expo-image` `Image.prefetch`.

### 1.8 Where ratios are preserved vs lost

| Stage | Ratio |
|-------|--------|
| Library pick | **Preserved** to mode target (4:5 or 9:16) |
| Camera capture | **Preserved** as sensor aspect |
| Normalize/upload | **Preserved** (no resize) |
| Composer preview | **Shown fully** (`contain`) — may letterbox |
| Hub feed / grids / viewer | **Re-cropped** with `contentFit="cover"` in fixed boxes |

**Root WYSIWYG break:** preview `contain` ≠ published `cover`.

### 1.9 PWA ingestion comparison (semantic reference)

| Step | PWA `StoryCameraModal` | Native |
|------|------------------------|--------|
| Library | File input → crop stage | Picker `allowsEditing` + aspect |
| Camera | Canvas frame → **mandatory crop stage** | Direct preview, **no crop** |
| Filters | `bakeBlobWithFilter` | Not wired |
| Normalize | Canvas JPEG ~0.92 | `ImageManipulator` 0.9 |
| Resize before upload | Only via crop | None |

---

## 2. Aspect ratio behavior (cross-surface)

### 2.1 Canonical fit modes in codebase

| Mode | Used where |
|------|------------|
| **`cover`** | `StoryMediaImage` (default), `RemoteImage`, `ProfileAvatar`, venue heroes, grids, viewer |
| **`contain`** | Composer preview; static brand (`HubTopChrome`, `IntencityBrandLockup`) |
| **Fixed height box** | Hub share feed (`hubShareMediaHeight`) — not a ratio, a cap |
| **`aspectRatio` style** | Profile/archive/hidden grids (1:1); moment detail (4:5); venue cards (5:6) |

### 2.2 Per-surface aspect table

| Surface | Container rule | Fit | Effective aspect | PWA mirror |
|---------|----------------|-----|------------------|------------|
| **Hub share feed** | `width: screen`, `height: min(52vw, 280)` | cover | ~width:height varies by device | `max-h-[min(52vw,280px)] object-cover` ✅ |
| **Story viewer** | `absoluteFill` | cover | Screen | `object-cover` fullscreen ✅ |
| **Moment detail** | `aspectRatio: 4/5`, `maxHeight: 640` | cover | 4:5 cap | PWA detail uses similar frame |
| **Profile grid** | `32.5%` width, `aspectRatio: 1` | cover | 1:1 | `aspect-square object-cover` ✅ |
| **Archive / hidden** | Same as profile grid | cover | 1:1 | ✅ |
| **Composer live** | 100% × 100% | fill (camera) | Device preview | Live camera |
| **Composer preview** | 100% × 100% | **contain** | Letterboxed source | PWA preview `object-contain` ✅ |
| **Hub moments rail** | Avatars only (no thumb) | cover | Circle in `StoryRing` | ✅ |
| **Map venue sheet** | `height: 168`, full width | cover | Fixed strip | PWA venue hero |
| **Hub places card** | `aspectRatio: 5/6` | cover | 5:6 | PWA venue chip |
| **Venue activity** | `height: 160` | RN `cover` | Fixed strip | Same intent; **different renderer** |
| **Discovery venue thumb** | Square `size` | cover | 1:1 | List thumb |
| **Avatars** | Explicit `size` circle | cover | 1:1 in circle | ✅ |

### 2.3 Visual “ratio jump” seams (user-visible)

1. **Post share from library (4:5)** → hub card **height cap** → extra vertical crop vs picker.
2. **Post moment from camera (~4:3)** → viewer **fullscreen cover** → different crop than preview.
3. **Tap hub share** → moment detail **4:5 frame** → third crop geometry.
4. **Tap profile cell (1:1)** → detail **4:5** or viewer **fullscreen** depending on route.
5. **Skeleton hub share** uses `aspectRatio: 4/5` + `maxHeight: 280` while live card uses **height-only** — loading ≠ loaded shape.

---

## 3. Rendering primitives

### 3.1 `StoryMediaImage` (`components/media/StoryMediaImage.tsx`)

- Engine: `expo-image`
- Default: `contentFit="cover"`
- `cachePolicy="memory-disk"`
- `transition={motion.fade.image}` (200ms)
- **Holdover:** `lastGoodUri` while next signed URL resolves
- Placeholder: solid `mediaPlaceholderColor` (`#141820`) — **no blurhash**

### 3.2 `RemoteImage` (`components/media/RemoteImage.tsx`)

- Venue / non-story HTTP URLs
- Same cache + fade + holdover pattern
- No Supabase signing

### 3.3 `ProfileAvatar` / `TabBarProfileAvatar`

- `resolveAvatarUri()` (`lib/avatar.ts`)
- Gradient + person icon under image
- Tab variant: grey ring placeholder (anti-flicker via `useMyAvatar`)

### 3.4 Outliers (not unified)

| Location | Renderer | Issue |
|----------|----------|-------|
| `StoryComposerModal` preview | RN `Image` | No expo-image disk cache; `contain` |
| `VenueActivityScreen` hero | RN `Image` | No signed URL layer; no holdover |
| Brand assets | RN `Image` `contain` | Static bundles |

---

## 4. Surface-by-surface matrix

| Surface | Component / route | Media source | Sizing | Crop | Loading | Prefetch | Known seam |
|---------|-------------------|--------------|--------|------|---------|----------|------------|
| Hub share feed | `HubShareFeedCard` | `image_url` | Full bleed × `hubShareMediaHeight` | cover | `StoryMediaImage` | Hub: top 3 shares | Skeleton 4:5 vs live height box |
| Moments rail | `OwnMomentRing`, `FriendHubRing` | Avatar URLs only | `StoryRing` storyLg | cover avatar | `ProfileAvatar` | Latest moment URL + avatars | No moment thumbnail in rail |
| Story viewer | `StoryViewerModal` | `media_url` / `image_url` | Full screen | cover | `StoryMediaImage` | Next slide + next group | Only fullscreen story media |
| Share/moment detail | `MomentDetailScreen` | `fetchMomentDetail` | 4:5 `maxHeight: 640` | cover | Skeleton tall block | None | Skeleton ≠ 4:5 |
| Profile grid | `ProfileTabGrid` | `image_url` | 1:1 cells | cover | `SkeletonGrid` | None | Square ≠ feed |
| Public profile | `PublicProfileScreen` | Same | Duplicated grid styles | cover | Same | None | Style duplication |
| Archive | `ProfileTabGrid` archive | Same | 1:1 + timestamp | cover | Same | None | — |
| Hidden shares | `archive-hidden.tsx` | Same | 1:1 | cover | Same | None | — |
| Composer | `StoryComposerModal` | Local URI | Full screen | contain preview | RN Image | None | WYSIWYG drift |
| Map venue sheet | `MapVenueSheet` | `heroUrl` | h=168 | cover | `RemoteImage` | None | — |
| Hub places | `VenueChipPlaceholder` | venue image | 5:6 card | cover | `RemoteImage` | None | — |
| Venue activity | `VenueActivityScreen` | hero URL | h=160 | RN cover | No holdover | None | **Wrong primitive** |
| Chat | `ChatThreadRow` | Avatars only | 56px | cover | Skeleton | None | No attachments |
| Notifications | `notifications.tsx` | Avatars 36px | — | cover | — | None | — |
| Search discovery | `DiscoverySearchScreen` | Avatar + `VenueDiscoveryThumb` | 44–48 | cover | — | None | — |
| Tab avatar | `TabBarProfileAvatar` | `useMyAvatar` | 28px | cover | Grey placeholder | Shared cache intent | Brief fallback flash |
| Comments sheet | `ShareCommentsBottomSheet` | Avatars 32/40 | — | cover | — | None | — |

---

## 5. Loading, caching, transitions

| Mechanism | Stories/shares | Venues | Avatars |
|-----------|----------------|--------|---------|
| Disk cache | `expo-image` memory-disk | Same | Same |
| Signed URL TTL | 3600s | N/A | Direct URL |
| Fade transition | 200ms image fade | 200ms | 200ms |
| Holdover frame | Yes (`StoryMediaImage`, `RemoteImage`) | Yes | Partial |
| Blur / progressive | **None** | **None** | **None** |
| Skeleton shape | Often mismatches loaded layout | 5:6 aligned for places | Circles OK |

### Prefetch call sites

1. `hub.tsx` — friend avatars; latest moment per user; first 3 share `image_url`s  
2. `StoryViewerModal` — next story in group; first story of next group  

---

## 6. Data model & fetch paths

| Concern | Implementation |
|---------|----------------|
| Column read | Most fetches use `image_url` only (`fetchActiveMoments`, `fetchHubFeedPreview`) |
| Viewer type | `media_url` populated in memory via `storyImageUrlFromRow` |
| Insert | Tries `media_url`; fallback insert without column |
| Expiry filter | Active moments: `expires_at` / `is_share` rules in fetch libs |
| Local-only | None for story media (all remote after post) |

---

## 7. Mature-app pattern reference (architecture only)

**Purpose:** Understand what problem each pattern solves — **not** to copy UI.

| App | Problem solved | Mechanism | Intencity relevance |
|-----|----------------|-----------|---------------------|
| **Instagram** | Feed rhythm + grid browse + story immersion | Fixed feed aspect classes; CDN variants; 1:1 grid; 9:16 story fullscreen | Shares need **feed immersion** without becoming IG; grids already 1:1 |
| **Snapchat** | Capture-first ephemeral | Camera-native aspect; fullscreen viewer; minimal feed crop | **Moments** align — immersive fullscreen, ephemeral |
| **TikTok** | Vertical full-bleed feed | One dominant aspect; aggressive preload | Overkill for Intencity; moments already vertical intent |
| **X/Twitter** | Mixed media in timeline | Capped height cards; `object-cover` in variable boxes | **Hub shares** already use capped height — same problem class |
| **All** | Upload normalization | Master asset + derived sizes | **Missing today** — single JPEG everywhere |

**Intencity-specific problems (not IG’s):**

- **Moments vs shares** are different social objects (ephemeral immersion vs durable feed presence).
- **Believable geography** — venue media is contextual, not performative.
- **Premium dark atmosphere** — letterboxing and crop jumps read as “broken,” not “artistic.”

---

## 8. System gaps (missing architecture)

| Gap | Impact |
|-----|--------|
| No **canonical aspect classes** in code | Each component invents layout |
| No **upload crop parity** for camera | Camera moments ≠ library moments |
| No **display variants** | Bandwidth + cache pressure on grids |
| No **WYSIWYG contract** | Preview ≠ feed ≠ detail |
| **Dual image stacks** (expo-image vs RN Image) | Inconsistent cache and fade |
| **Skeleton ≠ loaded geometry** | Layout shift / mistrust |
| No **blur/low-res placeholder** | Hard cuts on slow network |
| Avatar upload **deferred** | Profile edit is stub |

---

## 9. File index (implementation map)

| Concern | Path |
|---------|------|
| Upload | `src/lib/uploadStoryMedia.ts` |
| Normalize | `src/lib/normalizeStoryImage.ts` |
| Read bytes | `src/lib/readLocalImageBlob.ts` |
| Display URI | `src/lib/storyMediaUri.ts` |
| URL helper | `src/lib/storyMediaUrl.ts` |
| Prefetch | `src/lib/prefetchStoryMedia.ts` |
| Story renderer | `src/components/media/StoryMediaImage.tsx` |
| Venue renderer | `src/components/media/RemoteImage.tsx` |
| Composer | `src/components/create/StoryComposerModal.tsx` |
| Viewer | `src/components/stories/StoryViewerModal.tsx` |
| Hub card | `src/components/shares/HubShareFeedCard.tsx` |
| Detail | `src/components/moments/MomentDetailScreen.tsx` |
| Profile grid | `src/components/profile/ProfileTabGrid.tsx` |
| Hub layout math | `src/theme/hubLayout.ts` |
| Motion/placeholder | `src/theme/motion.ts` |

---

## 10. MEDIA-1 implementation map (2026-05-18)

| Layer | Path |
|-------|------|
| Layout tokens | `src/theme/mediaLayout.ts` |
| Unified renderer | `src/components/media/IntencityRemoteImage.tsx` |
| Story / venue wrappers | `StoryMediaImage.tsx`, `RemoteImage.tsx` |
| WYSIWYG preview | `src/components/create/ComposerMediaPreview.tsx` |
| Camera aspect crop | `src/lib/storyImageCrop.ts` |
| Profile grid cell | `src/components/profile/ProfileMediaGridCell.tsx` |

**Remaining gaps:** interactive pinch/zoom crop (MD-106), look filters (MD-107), CDN variants (MD-306), device QA sign-off.
