# MEDIA-3 — IG share crop + WYSIWYG unification

**Date:** 2026-06-02  
**Era:** Stabilization + media trust (with MODERATION-1 deploy)  
**Reference:** Instagram "New post" — preview top, Recents grid bottom, aspect toggle, Next → hub-faithful preview → Share

## Shipped

| Area | Change |
|------|--------|
| **IG composer** | `ShareNewPostComposer` — crop preview + Recents grid + header Next |
| **Crop viewport** | `ShareCropViewport` — pinch/pan, rule-of-thirds grid, 4:5 ↔ 1:1 toggle |
| **Flow wiring** | Library → crop export → `SharePostPreviewStage` → publish with `share_aspect` |
| **Viewer** | Share slides use full-bleed feed aspect (`shareViewerFeedFrameMetrics`) — matches hub |
| **Menu crash** | `ProfileMenuAnchor` — fixed top-right dropdown, no `measureInWindow` loop |

## WYSIWYG chain (shares)

1. **Crop frame** = `shareCropWindowSize` (full width × 4:5 or 1:1)
2. **Preview stage** = `shareFeedPreviewFrameStyle` (hub card)
3. **Hub feed** = `shareFeedDisplayFrameStyle` + `share_aspect`
4. **Detail** = `PostMediaFrame` same tokens
5. **Viewer** = `shareViewerFeedFrameMetrics` full width

## QA

1. Create → Stories tab → pick photo → crop with grid → toggle 4:5/1:1 → Next
2. Preview matches hub card width/aspect → Share → appears same on hub
3. Open share in viewer — same aspect, full width (not letterboxed card)
4. Profile ⋯ menu opens/closes without redbox

## Still deferred

- Multi-select carousel (IG Select mode)
- PWA hub `share_aspect` + true 4:5 feed frames
- Text/stickers (MEDIA-2.2+)
