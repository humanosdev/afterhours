# MEDIA-2 — unified media UX (native-first)

**Date:** 2026-06-02  
**Focus:** Unity between create → post → view (moments + shares). IG direction, Intencity brand — **not** PWA parity for this slice.

## Shipped (this pass)

| Area | Change |
|------|--------|
| **WYSIWYG crop** | Moment crop window = live composer frame (`cropWindowOverride`); full-width 9:16, no 360px cap |
| **Crop UX** | Pinch-to-zoom on crop stage (`react-native-gesture-handler`) |
| **Looks** | Filter rail on moment preview + share preview; baked on upload via `react-native-view-shot` + `react-native-color-matrix-image-filters` |
| **Viewer perf** | Progress timer isolated in `StoryViewerProgressBars` (viewer shell no longer re-renders 20×/s) |
| **Viewer polish** | Share slides: blurred backdrop + rounded card; holdover while loading; 7.5s moment dwell |
| **Hub feed** | Share cards tap through to `/moments/[id]` |

## Rebuild required

New native modules — run dev client rebuild:

```bash
cd apps/mobile && npx expo run:ios
# or android
```

## QA

1. **Moment:** Camera frame = crop window = viewer framing (edges line up).
2. **Pinch** crop on library photo; slider still works.
3. **Filter:** Pick Warm → post → hub/viewer shows warm bake.
4. **Viewer:** Progress smooth; share in viewer shows card on blur.
5. **Hub:** Tap share image → post detail.

## MEDIA-2.1 (2026-06-02)

| Area | Change |
|------|--------|
| **Language** | `mediaLexicon.ts` — UI says **moments** + **stories** (not posts/shares). Hub section **Stories**, profile tab **Stories**, publish copy |
| **Rings** | **No change** — avatar-only rings on hub rail (no moment preview thumbnails) |
| **Viewer** | Hold finger on story to pause progress |
| **Hub** | `openStoryOnTap` → story detail |

## Deferred (MEDIA-2.2+)

- Text/stickers on moments
- Video capture
- Hub feed typography pass (beyond copy)
