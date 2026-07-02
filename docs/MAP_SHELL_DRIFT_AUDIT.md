# Map shell drift audit — atmospheric parity (no live geography)

**Date:** 2026-05-17  
**PWA source:** `apps/web/src/app/map/page.tsx` (+ `AppShell`, `BottomNav`, `globals.css`)  
**Native:** `apps/mobile/app/(app)/(tabs)/map.tsx` + `src/components/map/*`  
**Scope:** Layout, glass, stacking, safe areas — **NOT** GPS, `user_presence`, heat GL, or writes.

---

## Executive summary

Native map shell is **structurally aligned** with PWA (full-bleed map, floating tab bar, category tray, checkpoint bar, venue sheet, tab hide on sheet). Remaining drift is mostly **spacing tokens**, **sheet atmosphere**, and **deferred live layers** (correctly absent).

**Stabilization fixes shipped (2026-05-17):**
- Top overlay gap **30px** (was 10px) — matches PWA `safe-area-top + 30px`
- Checkpoint bar width cap **460px** (was 352px)
- Nav buttons **44×44** (was 40×40)
- Venue sheet height **74svh max 760px** (was 68%)
- Sheet backdrop **removed** (PWA: map stays fully visible above sheet — continuous city)
- Hero **168px** (PWA mobile)

---

## Side-by-side audit

### Shell & safe areas

| Item | PWA | Native | Status |
|------|-----|--------|--------|
| Full-bleed map | `100dvh`, immersive AppShell | `flex:1` tab scene | ✅ |
| Top overlay offset | `safe-area + 30px` | `mapTopOverlayPaddingTop` → **30px** | ✅ fixed |
| Overlay column width | `min(94vw, 420px)` | `OVERLAY_W` same | ✅ |
| Column gap | `gap-2` (8px) | `gap: 8` | ✅ |
| Tab bar over map | Portaled, z 10150 | FloatingTabBar | ✅ |
| Tab bar hide on sheet | `map-venue-sheet-visibility` event | `tabBarStyle.display: none` | ✅ |

### Checkpoint bar

| Item | PWA | Native | Status |
|------|-----|--------|--------|
| Width | `min(92vw, 460px)` | **460 cap** | ✅ fixed |
| Bottom position | `safe-area + 124px` (CSS) | `tabBarBottom + chrome + 10px` (visual gap) | ✅ equivalent |
| z above nav | 10156 > 10150 | checkpoint z 12, tab floats | ✅ |
| Nav button size | `h-11 w-11` (44px) | **44px** | ✅ fixed |
| Heat pulse on bar | Dynamic by activity | Static accent glow only | ⏸ P2O-C (no fake pulse) |
| Auto-tour / camera | `easeTo` on change | `cameraRefitToken` on Locate only | ⏸ partial |

### Category & secondary controls

| Item | PWA | Native | Status |
|------|-----|--------|--------|
| Filter tray glass | `bg-primary/60 blur-xl` | `GlassSurface control` | ✅ |
| Chip size / active border | 11px, accent hex | Same pattern | ✅ |
| Locate + Friends row | inline row | `MapSecondaryControls` | ✅ |
| Friends panel | `w-[112px]` right-aligned | `width: 112`, `alignSelf: flex-end` | ✅ |
| Ghost pill | Toggle (write) | Read-only from profile | ✅ honest (SYSTEM_TRUTH) |

### Venue sheet

| Item | PWA | Native | Status |
|------|-----|--------|--------|
| Height | `74svh` max 760 | **74svh max 760** | ✅ fixed |
| Corner radius | `1.75rem` (28) | 28 | ✅ |
| Hero height | 168–188px | **168px** | ✅ fixed |
| Backdrop dimmer | None | **None** — transparent tap zone above sheet + close control | ✅ |
| Bottom padding | `safe-area + 20` | `safeAreaBottomInset + 20` when tab hidden | ✅ |
| Density / live counts | When presence exists | Deferred copy | ⏸ P2O-C |
| Drag dismiss | Pointer drag | Backdrop + close | ⚠️ interaction diff |

### Atmosphere (non-functional)

| Item | PWA | Native | Status |
|------|-----|--------|--------|
| Mapbox fog / night basemap | Yes | `MapAtmosphereOverlay` vignette only | ⏸ P2O-C |
| Heat layers on map | GL | Venue pins only | ⏸ P2O-C |
| Friend dots | `user_presence` | Absent | ⏸ P2O-C |
| GPS puck | Yes | Absent | ⏸ P2O-B |

---

## Deferred (do NOT fake in VP-2)

| Capability | Phase |
|------------|--------|
| `user_presence` read + friend subtitles | P2O-C |
| Heat-ranked trending / checkpoint pulse | P2O-C |
| GPS / `expo-location` | P2O-B |
| Realtime presence subscription | REALTIME-1 |
| Ghost mode toggle on map | Write slice |

---

## Device QA — map shell only

- [ ] Category tray sits **~30px** below status bar (not cramped under notch)
- [ ] Checkpoint bar width feels similar to PWA on iPhone Pro Max / standard
- [ ] Checkpoint clears floating tab bar with ~10px perceived gap
- [ ] Open venue sheet — tab bar hides, sheet ~¾ height, map still visible above
- [ ] Map remains visible above sheet (no modal scrim)
- [ ] Friends panel docks **right**, narrow (~112px)
- [ ] No “LIVE” dots on map pins without presence data
- [ ] Locate refits camera (preview venues only)

---

## Files

| Path | Role |
|------|------|
| `apps/mobile/src/shell/tabBarMetrics.ts` | Top/checkpoint spacing constants |
| `apps/mobile/app/(app)/(tabs)/map.tsx` | Map shell composition |
| `apps/mobile/src/components/map/*` | Chrome components |
| `apps/web/src/app/map/page.tsx` | PWA source of truth |
