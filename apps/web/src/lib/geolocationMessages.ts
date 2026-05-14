/** User-facing copy for GeolocationPositionError / failures */
export function geolocationFailureMessage(code?: number): string {
  switch (code) {
    case 1:
      return "Location is off. Turn it on in your browser or system settings so friends can see you on the map.";
    case 2:
      return "We couldn’t determine your location. Try moving near a window, enabling Wi‑Fi, or checking GPS.";
    case 3:
      return "Location timed out. Try again in a clearer spot or move outdoors briefly.";
    default:
      return "We couldn’t access your location. Check permissions and try again.";
  }
}

export const PRESENCE_SAVE_FAILED =
  "Couldn’t save your location. Check your connection, or sign out and back in if this keeps happening.";

/** Non-HTTPS (e.g. LAN IP) — browsers block or degrade geolocation. */
export const LOCATION_INSECURE_CONTEXT =
  "Location needs HTTPS or localhost. On plain http:// (except localhost) GPS usually won’t work — use HTTPS or a tunnel so friends can see you.";
