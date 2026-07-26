# Tab layout stability (cold open)

Prevents the whole-page **downward jump** on Hub / Chat / Profile first open. Locked down after QA video analysis (2026-07).

## Symptom

Entire screen (header + body) shifts down ~20–50px when opening a tab or when skeleton dismisses — not just feed content reflow.

## Causes & fixes

| Cause | Fix |
|-------|-----|
| `SafeAreaView` re-insets when hidden tab focuses | `Screen` → plain `View` + frozen `layoutInsets` (`src/theme/layoutInsets.ts`) |
| Live `useSafeAreaInsets()` in height math | Use `layoutInsets` / `useStableLayoutInsets()` only |
| Tab detach on blur | `detachInactiveScreens={false}` in `(tabs)/_layout.tsx` |
| Skeleton/content mount swap | `TabBootBody`: content always mounted, skeleton as absolute overlay |
| Skeleton fade | Instant overlay remove (no opacity animation) |
| Early `markTabBootConsumed` | Only after 1.2s focused hold in `useTabColdOpenBoot` |
| Chat `fixedHeader` split | Reverted — Chat uses single scroll stack |

## Key files

- `src/theme/layoutInsets.ts` — frozen safe area
- `src/components/Screen.tsx` — manual padding, optional `fixedHeader` (not Chat)
- `src/components/ui/TabBootBody.tsx` — overlay skeleton
- `src/hooks/useTabColdOpenBoot.ts` — 1.2s boot hold
- `app/(app)/(tabs)/_layout.tsx` — tab navigator flags
- `app/(app)/(tabs)/chat.tsx` — unified scroll (no `fixedHeader`)

## Agent rule

See `.cursor/rules/mobile-tab-layout-stability.mdc` — do not regress while editing other mobile features.
