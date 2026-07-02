/**
 * PWA `map/page.tsx` camera moves — `easeTo` duration, zoom, pitch, bearing, programmatic guard.
 * @see apps/web/src/app/map/page.tsx `armProgrammaticCamera`, `runLocateCycle`, checkpoint effect
 */

export type PwaCameraMove =
  | { kind: "initial-user-center"; lat: number; lng: number }
  | { kind: "locate-step0"; lat: number; lng: number; currentZoom: number }
  | { kind: "locate-step1"; lat: number; lng: number }
  | {
      kind: "checkpoint";
      lat: number;
      lng: number;
      activity: number;
      distanceFromYou: number;
      currentZoom: number;
    }
  | { kind: "venue-focus"; lat: number; lng: number; currentZoom: number }
  | { kind: "friend-focus"; lat: number; lng: number; currentZoom: number; atVenue: boolean };

export type PwaCameraSetConfig = {
  centerCoordinate: [number, number];
  animationDuration: number;
  animationMode: "easeTo";
  zoomLevel?: number;
  pitch?: number;
  heading?: number;
};

export function armProgrammaticCamera(untilMs: number, ref: { current: number }): void {
  if (untilMs > ref.current) ref.current = untilMs;
}

/** PWA checkpoint dynamic zoom + duration (`easeTo` with `easing: t * (2 - t)` on web). */
export function checkpointEaseParams(args: {
  activity: number;
  distanceFromYou: number;
  currentZoom: number;
}): { zoomLevel: number; durationMs: number; programmaticGuardMs: number } {
  const { activity, distanceFromYou, currentZoom } = args;
  const dynamicZoom =
    16.2 +
    Math.min(0.6, Math.max(0, activity / 24)) -
    Math.min(0.3, Math.max(0, distanceFromYou / 2500) * 0.08);
  const zoomLevel = Math.max(15.75, Math.min(17.05, dynamicZoom));
  const zoomSpan = Math.abs(zoomLevel - currentZoom);
  const durationMs = Math.min(2600, Math.max(1000, 820 + zoomSpan * 520));
  return {
    zoomLevel,
    durationMs,
    programmaticGuardMs: Math.ceil(2200 + durationMs + 120),
  };
}

/** Build `setCamera` payload + programmatic guard for a PWA-equivalent move. */
export function buildPwaCameraMove(move: PwaCameraMove): {
  config: PwaCameraSetConfig;
  programmaticGuardMs: number;
} {
  switch (move.kind) {
    case "initial-user-center":
      // PWA first GPS `easeTo`: center only, duration 800, no zoom/pitch change.
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          animationDuration: 800,
          animationMode: "easeTo",
        },
        programmaticGuardMs: 1200,
      };
    case "locate-step0":
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          zoomLevel: Math.max(15.5, move.currentZoom),
          pitch: 0,
          heading: 0,
          animationDuration: 520,
          animationMode: "easeTo",
        },
        programmaticGuardMs: 700,
      };
    case "locate-step1":
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          zoomLevel: 1.65,
          pitch: 0,
          heading: 0,
          animationDuration: 760,
          animationMode: "easeTo",
        },
        programmaticGuardMs: 900,
      };
    case "checkpoint": {
      const { zoomLevel, durationMs, programmaticGuardMs } = checkpointEaseParams({
        activity: move.activity,
        distanceFromYou: move.distanceFromYou,
        currentZoom: move.currentZoom,
      });
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          zoomLevel,
          pitch: 40,
          heading: 0,
          animationDuration: durationMs,
          animationMode: "easeTo",
        },
        programmaticGuardMs,
      };
    }
    case "venue-focus":
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          zoomLevel: Math.max(move.currentZoom, 15.8),
          animationDuration: 950,
          animationMode: "easeTo",
        },
        programmaticGuardMs: 1100,
      };
    case "friend-focus":
      return {
        config: {
          centerCoordinate: [move.lng, move.lat],
          zoomLevel: Math.max(move.currentZoom, move.atVenue ? 15.8 : 15.5),
          animationDuration: 950,
          animationMode: "easeTo",
        },
        programmaticGuardMs: 1100,
      };
  }
}

export function applyPwaCameraMove(
  setCamera: ((config: Record<string, unknown>) => void) | undefined,
  programmaticUntilRef: { current: number },
  move: PwaCameraMove
): void {
  if (!setCamera) return;
  const { config, programmaticGuardMs } = buildPwaCameraMove(move);
  armProgrammaticCamera(Date.now() + programmaticGuardMs, programmaticUntilRef);
  setCamera(config as Record<string, unknown>);
}
