# Intencity native media doctrine

**Date:** 2026-05-18  
**Status:** **Implemented (MEDIA-1, 2026-05-18)** — `apps/mobile/src/theme/mediaLayout.ts` + unified renderers. Interactive camera crop (full PWA parity) remains partial.  
**Binding rule:** [IMPLEMENTATION_DECISION_FRAMEWORK.md](./IMPLEMENTATION_DECISION_FRAMEWORK.md) — native improves **execution**, not **semantics**. PWA remains product source-of-truth.

**This is not:** a redesign, an Instagram clone, or “make media prettier.”  
**This is:** Intencity’s **native media language** — trustworthy, unified, premium, geographically believable.

---

## 1. Product semantics (unchanged)

| Object | Meaning | Media feel |
|--------|---------|------------|
| **Moment** | Ephemeral, immersive, friend-context | Fullscreen integrity, vertical intent, story viewer |
| **Share** | Durable social signal in hub feed | Feed immersion, socially alive, edge-bleed width |
| **Venue media** | Geographic context | Card/sheet heroes — supportive, not hero-of-app |
| **Avatar** | Identity anchor | Circular, stable, no tab-bar flicker |

Native must **not** collapse moments into shares or vice versa through layout choices.

---

## 2. Design principles

1. **One renderer family** for remote bitmaps (`expo-image` + shared wrapper), minimal RN `Image` exceptions.
2. **One layout token source** per aspect class — components consume tokens, do not invent dimensions.
3. **WYSIWYG where the user commits** — post preview must match the dominant published surface for that mode.
4. **Cover is a display choice, not an ingest surprise** — crop stages happen before upload when product demands an aspect.
5. **Honest loading** — skeleton geometry matches loaded layout; holdover frames on URL churn.
6. **No fake variants** — until backend/CDN exists, doctrine defines **logical** variants only; implementation may still use one file with consistent boxes.
7. **Preserve atmosphere** — dark `#141820` placeholders, restrained 200ms fades, no stock blur blobs unless added deliberately later.

---

## 3. Canonical aspect classes

Logical classes (not necessarily separate files yet):

| Class ID | Ratio / rule | Primary ingest | Primary surfaces |
|----------|--------------|----------------|------------------|
| `VERTICAL_STORY` | 9:16 | Library + **camera** (target) | Story viewer, moment detail optional |
| `SHARE_FEED` | 4:5 source | Library picker | Hub feed (display box below), share detail |
| `SHARE_FEED_DISPLAY` | `width × min(52vw, 280px)` | N/A (layout) | Hub `HubShareFeedCard` only |
| `SQUARE_GRID` | 1:1 | N/A (display) | Profile, archive, hidden |
| `FULLSCREEN_IMMERSIVE` | Device / cover safe | Camera moments in viewer | `StoryViewerModal` |
| `VENUE_CARD` | 5:6 | N/A | Hub places rail |
| `VENUE_HERO` | Fixed height (~168px) | N/A | Map sheet, activity |
| `AVATAR` | 1:1 in circle | Profile upload (deferred) | Rings, rows, tab, comments |

**Note:** `SHARE_FEED` (asset) and `SHARE_FEED_DISPLAY` (container) are **intentionally different** on PWA — hub uses capped height, not a pure 4:5 frame. Doctrine **preserves** that semantic (immersion over literal 4:5 frame in feed).

---

## 4. Canonical rendering rules (per surface)

### 4.1 Hub share feed

| Rule | Value |
|------|--------|
| Class | `SHARE_FEED_DISPLAY` |
| Width | Full bleed (`-screenPaddingX`) |
| Height | `min(52vw, 280px)` token — **single source:** `hubLayout.hubShareMediaHeight` |
| Fit | `cover`, center |
| Renderer | `StoryMediaImage` |
| Skeleton | **Same height token**, not `aspectRatio: 4/5` alone |

### 4.2 Story viewer (moments + shares)

| Rule | Value |
|------|--------|
| Class | `FULLSCREEN_IMMERSIVE` |
| Layout | `absoluteFill` |
| Fit | `cover` |
| Gesture | Tap zones unchanged (PWA parity) |
| Prefetch | Next slide + next group head |

### 4.3 Moment / share detail (`/moments/[id]`)

| Rule | Value |
|------|--------|
| Shares | `SHARE_FEED` frame: `aspectRatio 4/5`, `maxHeight` token |
| Moments | Prefer `VERTICAL_STORY` or fullscreen tap-through to viewer — detail frame must not fight viewer |
| Fit | `cover` |
| Skeleton | Match `mediaFrame` exactly |

### 4.4 Profile / archive / hidden grids

| Rule | Value |
|------|--------|
| Class | `SQUARE_GRID` |
| Cell | `32.5%` width, `aspectRatio: 1` |
| Fit | `cover` |
| Component | One shared `ProfileMediaGrid` (doctrine target) — eliminate duplicated StyleSheets |

### 4.5 Moments rail

| Rule | Value |
|------|--------|
| Media | **Avatar only** (no thumbnail in rail) — matches PWA |
| Ring | `StoryRing` tokens (`storyLg`, `viewer` in viewer chrome) |

### 4.6 Composer

| Stage | Rule |
|-------|------|
| Live camera | Full bleed, no letterbox |
| Preview | **Mode-aware WYSIWYG:** shares preview in `SHARE_FEED_DISPLAY` box or 4:5 frame; moments preview in `VERTICAL_STORY` or fullscreen-safe frame — **not** generic `contain` on full screen |
| Library | OS crop to mode aspect before preview |
| Camera | **Post-shutter crop stage** required for parity (PWA `react-easy-crop`) before preview/post |

### 4.7 Venue surfaces

| Rule | Value |
|------|--------|
| Card | `VENUE_CARD` 5:6, `RemoteImage` |
| Sheet / activity | `VENUE_HERO` fixed height token (single constant for 168/160 drift) |
| Fit | `cover` |

### 4.8 Avatars

| Rule | Value |
|------|--------|
| Class | `AVATAR` |
| Fit | `cover` |
| Cache | Shared `resolveAvatarUri` + disk cache |
| Tab bar | Hold last-good URL; no black flash (VP-2 cohesion) |

---

## 5. Crop philosophy

**Priority order when rules conflict:**

1. **Semantic fidelity** — moment vs share distinction preserved  
2. **Fullscreen integrity** — moments in viewer must feel intentional, not accidentally cropped  
3. **Feed immersion** — shares feel edge-to-edge and alive in hub  
4. **Scroll rhythm** — consistent card heights; no layout jump skeleton → loaded  
5. **Fidelity in preview** — user sees what hub/viewer will emphasize  
6. **Thumbnail efficiency** — future optimization, not current hack per screen  

**Ingest crops (authoritative):**

| Source | Moment | Share |
|--------|--------|-------|
| Library | 9:16 | 4:5 |
| Camera | 9:16 (crop stage) | 4:5 (crop stage) |

**Display crops (non-destructive):**

- `cover` inside fixed boxes is allowed **only** when the box is part of the product language (hub height cap, 1:1 grid).
- Do not apply a **new** display crop that contradicts the ingest aspect without user awareness.

---

## 6. Loading doctrine

| Layer | Rule |
|-------|------|
| Placeholder color | `#141820` (`mediaPlaceholderColor`) everywhere |
| Transition | 200ms fade (`motion.fade.image`) — no flashy crossfades |
| Holdover | Keep last decoded frame while signed URL refreshes |
| Skeleton | Must use **same tokens** as loaded component (height, aspectRatio, width %) |
| Prefetch hierarchy | 1) Viewer next/prev 2) Hub above-fold shares 3) Rail avatars 4) Grid on profile focus |
| Blurhash / LQIP | **Deferred** — if added later, one shared encoder policy; not per-component experiments |
| Error | Solid placeholder + dev log; no broken icon tiles in feed |

---

## 7. Canonical variant strategy (future-safe, not implemented)

Logical variants for when CDN/edge transforms exist:

| Variant | Use | Max dimension hint |
|---------|-----|-------------------|
| `original` | Upload master | As captured (post-crop) |
| `viewer` | Story viewer | Long edge ≤ 1440 |
| `feed` | Hub share card | Width ≈ device width |
| `grid` | Profile/archive | 400×400 |
| `thumb` | Rail preview (if ever) | 120×120 |
| `blur` | Placeholder | 20px wide LQIP |

**Until then:** all surfaces use `original` via signed URL; discipline is **layout tokens + fit**, not multiple URLs.

---

## 8. Upload normalization doctrine (target)

| Step | Rule |
|------|------|
| Input | Camera or library URI |
| Crop | Mode aspect enforced **before** normalize (camera included) |
| Orient | EXIF upright (explicit action if manipulator implicit is insufficient) |
| Format | JPEG only to storage |
| Quality | Single constant (0.9 native / 0.92 PWA — pick one in implementation pass) |
| Resize | **Optional** max long-edge cap (e.g. 2048) — one constant, not per-surface |
| Metadata | Strip sensitive EXIF; keep created_at in DB only |
| Path | `{userId}-{timestamp}.jpg` unchanged |
| Failure | Fail post with user message — **no** silent HEIC-as-JPEG mislabel |

---

## 9. Execution principles (implementation pass)

When coding the unified pass:

1. Introduce `src/theme/mediaLayout.ts` (or equivalent) exporting all box tokens.  
2. Extend `StoryMediaImage` props: `layoutClass` enum → resolves style + skeleton.  
3. Consolidate `VenueActivityScreen` onto `RemoteImage`.  
4. Composer preview uses layout class, not raw `contain`.  
5. Add camera crop stage (library exists on web) — **parity**, not redesign.  
6. Align skeletons in `HubFeedSkeleton`, `MomentDetailScreen`, profile grids.  
7. Do **not** change Supabase schema, expiry rules, or hub feed data model.  
8. Do **not** change PWA.  
9. Device QA matrix: one checklist per aspect class ([MEDIA_DRIFT_REGISTER](./MEDIA_DRIFT_REGISTER.md) zeros).

---

## 10. Explicit non-goals

- Rebrand UI like Instagram / TikTok  
- Video / Reels pipeline  
- AI filters or beauty modes  
- Server-side image workers (this phase)  
- Changing hub share **height-cap** semantics to pure 4:5 frames  
- Thumbnail moment previews in rail (unless PWA gains them)  

---

## 11. Success criteria (VP-2 media cohesion)

- [ ] User can predict crop from composer preview for each mode  
- [ ] Hub skeleton and loaded share card share exact height  
- [ ] Story viewer + hub + detail feel like one system  
- [ ] No RN `Image` for remote story/venue URLs except static assets  
- [ ] Camera and library produce same aspect per mode  
- [ ] Drift register P0/P1 items closed or accepted with doc entry  

---

## 12. Related docs

| Doc | Role |
|-----|------|
| [MEDIA_ARCHITECTURE_AUDIT.md](./MEDIA_ARCHITECTURE_AUDIT.md) | Current-state truth |
| [MEDIA_DRIFT_REGISTER.md](./MEDIA_DRIFT_REGISTER.md) | Gaps to close |
| [MEDIA_BEHAVIOR_MATRIX.md](./MEDIA_BEHAVIOR_MATRIX.md) | Behavioral ops matrix |
| [PWA_BEHAVIORAL_TRUTH_AUDIT.md](./PWA_BEHAVIORAL_TRUTH_AUDIT.md) | Product semantics |
