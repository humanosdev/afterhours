# MAP-C slice 1 — venue heat / glow (PWA parity)

Native map tab now mirrors PWA `venue-heat`, `venue-glow`, and `venue-core` from `apps/web/src/app/map/page.tsx`.

## Shipped

- **Heatmap** — ice → teal → pink → electric blue ramp, weight/intensity/radius/opacity expressions, 200ms breathe on `heatmap-intensity`
- **Venue glow** — zoom-scaled `circle-radius` from `combined_count` (+ `checkpoint_pulse` / `ambient_pulse` props; pulse animation deferred)
- **Venue core** — same color steps as PWA; `circle-opacity` always 0 (PWA behavior)
- **Presence markers** — solid ring only (PWA `boxShadow` first term); **hidden entirely below zoom 8**
- **Category pins** — PWA `icon-opacity` with **linear zoom interpolation** (pins ease in ~zoom 11.5–14, not hard cutoff); hidden at true globe zoom when empty; no category-colored RN shadow
- **Venue labels** — hidden below zoom 11.6 (PWA `venues-name-labels` minzoom)
- **Checkpoint bar** — heat border/shadow when `activity > 0`; neutral grey bar when empty
- **Venue sheet** — heat-keyed top rim + stack shadow (`venueSheetInnerRimStyle` / `venueSheetStackShadowStyle`); grey rim when no crowd

## Heat color ladder (all surfaces)

| Activity | Hex | Where |
|----------|-----|--------|
| 0 | `#7c8aa0` grey | Glow halos, sheet rim, checkpoint (neutral) |
| 1+ | `#7dd3fc` ice | |
| 4+ | `#14b8a6` teal | |
| 9+ | `#ff2ea6` pink | |
| 16+ | `#1F52F5` electric blue | |

Shared: `@intencity/shared` `venueHeatHexFromActivity`.

## Deferred (see [MAP_C_SLICE2.md](./MAP_C_SLICE2.md) + polish)

| Feature | Phase |
|---------|--------|
| Checkpoint pulse, auto-tour, district flow, fog/night chrome | **MAP-C slice 2** ✅ |
| Full basemap + dash + marker lerp | **MAP-C polish** ✅ [MAP_C_POLISH.md](./MAP_C_POLISH.md) |
| P2O-D presence **writes** | P2O-D |

## Test

1. Seed presence on PWA with same account; open map on native dev client.
2. Zoom **out** past city view: heatmap visible; friend pins **gone** (not hollow circles).
3. Zoom **in** past zoom 8: rings on avatars, **no** outer shadow bloom on friends/you.
4. Tap venue: sheet INSIDE/NEARBY counts match PWA.
5. Cycle checkpoints: bar border tints with activity tier.
