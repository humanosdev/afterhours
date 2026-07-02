# MEDIA-0.1 — Media entry stabilization (complete)

**Date:** 2026-05-18  
**Scope:** Crash prevention + honest copy + picker permissions — **not** MEDIA-1 camera parity.

---

## PWA reference (why native copy differs)

| Element | PWA (`AppShell` + `StoryCameraModal`) | Native MEDIA-0.1 |
|---------|--------------------------------------|------------------|
| Sheet CTA | `Camera — moment` / `Camera — share` | `Choose photo — moment` / `Choose photo — share` |
| Reason | Opens **live camera** (`getUserMedia`) | **Library only** until MEDIA-1 |
| Sheet body | Implied camera on next screen | Explicit: library on next screen |
| Sheet hints | Same | Same (unchanged) |
| Modal library affordance | `Choose from library` (icon + fallback card) | Primary: `Choose from library` |
| Post CTA | `Your story` / `Share` | Same |
| Posting overlay | `Posting…` | Same |

**Parity rule:** Match PWA **flow order** (sheet → pick → preview → post) and **upload semantics**; do **not** copy “Camera” label without camera capability.

---

## Shipped (code)

| # | Change | File(s) |
|---|--------|---------|
| 1 | `expo-image-picker` plugin + permission strings | `app.config.ts` |
| 2 | iOS `NSPhotoLibraryUsageDescription` (+ camera strings for future) | `ios/Intencity/Info.plist` |
| 3 | Honest copy constants | `mediaComposerCopy.ts` |
| 4 | Sheet CTA + body | `CreateComposerSheet.tsx` |
| 5 | try/catch picker + upload + posting overlay | `StoryComposerModal.tsx` |
| 6 | try/catch upload path + error codes | `uploadStoryMedia.ts` |

---

## Classification after MEDIA-0.1

| Subsystem | Status |
|-----------|--------|
| Library picker | **Stable** (requires **native rebuild**) |
| Upload + insert | **Partial** — same as pre-0.1 when network/RLS ok |
| Live camera | **Deferred** — MEDIA-1 |
| CTA honesty | **Stable** |
| Hard crash on deny/picker | **Mitigated** — Alert, no unhandled throw |

---

## Device QA (required)

**Rebuild dev client** after pulling (plist + plugin):

```bash
cd apps/mobile
npx expo prebuild --platform ios   # if regenerating native projects
npx expo run:ios                   # or run:android
```

Then:

```bash
npx expo start --clear
```

| Step | Expected |
|------|----------|
| Hub → Create → **Choose photo — moment** | No “Camera” label |
| Continue → **Choose from library** | Picker opens, **no crash** |
| Deny permission | Alert, app stays alive |
| Pick image → **Your story** / **Share** | Preview + post |
| Post success | Returns to hub; epoch refresh |
| Post failure (airplane mode) | Alert, no crash |

---

## VP-2 signoff impact

| Gate | Before MEDIA-0.1 | After |
|------|------------------|-------|
| Media creation crash | **P0 blocker** | **Mitigated** — verify on device |
| Misleading “Camera” CTA | **Drift** | **Fixed** |
| Full camera parity | Out of scope | Still MEDIA-1 |

---

## Related

- [MEDIA_SYSTEM_STATUS.md](./MEDIA_SYSTEM_STATUS.md)
- [VP2_STABILIZATION_INVENTORY.md](./VP2_STABILIZATION_INVENTORY.md)
