/**
 * Freshness math for presence windows — always wall clock.
 * `presenceClock` from PresenceProvider is a re-render tick only; never pass it as `nowMs`.
 */
export function presenceNowMs(): number {
  return Date.now();
}
