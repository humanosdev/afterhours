import type { PresenceRefreshBoost } from "./mapPresenceRefresh";

/**
 * Native read-side timing — Phase 3 (P2O-D).
 *
 * Windows live in `@intencity/shared` (2m badge / 8m heat / 12m map live / 30m recent).
 * Writes run every 3–5s foreground. Poll + UI clocks below are chosen so reads stay
 * within ~1/6 of the tightest window they display (2m online badge → ≤20s poll, 10s clock).
 *
 * @see docs/PRESENCE_WINDOWS_P2O_D.md · docs/NATIVE_CUTOVER.md §Phase 3
 */

/** Hub / profile / chat shell — foreground presence fetch (not map-boosted). */
export const HUB_PRESENCE_POLL_MS = 20_000;

/** Recompute hub subtitles, online chips, freshness tiers without a network round-trip. */
export const HUB_PRESENCE_CLOCK_MS = 10_000;

/** Map tab — matches native write cadence; heat window is 8m. */
export const MAP_PRESENCE_POLL_MS = 3_000;

/** Map glow / checkpoint labels — same 10s cadence as hub for consistent “live” feel. */
export const MAP_PRESENCE_CLOCK_MS = 10_000;

/** Infrequent read refresh while app is backgrounded (no writes). Realtime still delivers deltas. */
export const BACKGROUND_PRESENCE_POLL_MS = 60_000;
export const BACKGROUND_PRESENCE_CLOCK_MS = 60_000;

/** Live places leaderboard — heat-ranked; 20s ≈ 4 refreshes/min within 8m heat window. */
export const LIVE_PLACES_PRESENCE_POLL_MS = 20_000;

/** Chat list + thread — realtime primary; poll catches missed postgres_changes. */
export const CHAT_POLL_FALLBACK_MS = 15_000;

/** Hub activity + chat tab badges while foreground. */
export const FOREGROUND_UNREAD_POLL_MS = 15_000;

/** Notification badge poll while backgrounded. */
export const BACKGROUND_UNREAD_POLL_MS = 60_000;

/**
 * Resume burst coalesce — 0 = immediate on AppState `active` (Phase 3 target).
 * A second `active` within this window is ignored (iOS occasionally double-fires).
 */
export const RESUME_BURST_DEBOUNCE_MS = 0;

/** Realtime channel healthy this long → foreground poll is health-check only. */
export const REALTIME_HEALTHY_GRACE_MS = 30_000;

/** Foreground poll when `user_presence` realtime is SUBSCRIBED and stable. */
export const REALTIME_HEALTHY_PRESENCE_POLL_MS = 60_000;

export type PresenceRefreshPolicy = {
  pollMs: number;
  clockMs: number;
};

/** Adaptive duty cycle — map boost only when foreground + map focused. */
export function resolvePresenceRefreshPolicy(args: {
  appForeground: boolean;
  mapBoost: PresenceRefreshBoost | null;
  realtimeHealthy?: boolean;
}): PresenceRefreshPolicy {
  if (!args.appForeground) {
    return {
      pollMs: BACKGROUND_PRESENCE_POLL_MS,
      clockMs: BACKGROUND_PRESENCE_CLOCK_MS,
    };
  }

  let clockMs = HUB_PRESENCE_CLOCK_MS;
  let pollMs = HUB_PRESENCE_POLL_MS;

  if (args.mapBoost) {
    pollMs = args.mapBoost.pollMs;
    clockMs = args.mapBoost.clockMs;
  }

  if (args.realtimeHealthy) {
    pollMs = REALTIME_HEALTHY_PRESENCE_POLL_MS;
  }

  return { pollMs, clockMs };
}
