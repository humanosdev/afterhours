/**
 * PWA district-flow dash march — 96ms `line-dashoffset` updates.
 * @see apps/web/src/app/map/page.tsx (~L2566)
 */

export function districtFlowDashOffsets(nowMs = Date.now()): { glow: number; core: number } {
  const t = nowMs / 1000;
  const off = -(((t * 0.85) % 1.6) * 7);
  return { glow: off, core: off * 1.12 };
}
