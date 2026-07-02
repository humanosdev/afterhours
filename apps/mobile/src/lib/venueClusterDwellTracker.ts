import type { PresenceVenueZone } from "@intencity/shared";

/** Client-side dwell clocks — supplements DB FSM when rows lack `venue_state` / drive-by filtering. */
export class VenueClusterDwellTracker {
  private innerSince = new Map<string, number>();
  private outerSince = new Map<string, number>();

  private key(userId: string, venueId: string): string {
    return `${userId}:${venueId}`;
  }

  /** Call once per marker pass for each user currently in a venue zone. */
  observe(
    userId: string,
    venueId: string,
    zone: PresenceVenueZone,
    nowMs: number
  ): { innerSinceMs: number | null; outerSinceMs: number | null } {
    const k = this.key(userId, venueId);
    if (zone === "inner") {
      if (!this.innerSince.has(k)) this.innerSince.set(k, nowMs);
      this.outerSince.delete(k);
      return { innerSinceMs: this.innerSince.get(k) ?? null, outerSinceMs: null };
    }
    if (zone === "outer") {
      if (!this.outerSince.has(k)) this.outerSince.set(k, nowMs);
      this.innerSince.delete(k);
      return { innerSinceMs: null, outerSinceMs: this.outerSince.get(k) ?? null };
    }
    return { innerSinceMs: null, outerSinceMs: null };
  }

  clearUserVenue(userId: string, venueId: string): void {
    const k = this.key(userId, venueId);
    this.innerSince.delete(k);
    this.outerSince.delete(k);
  }

  /** Drop clocks for users/venues no longer in any zone this frame. */
  prune(activeKeys: Iterable<string>): void {
    const active = new Set(activeKeys);
    for (const k of this.innerSince.keys()) {
      if (!active.has(k)) this.innerSince.delete(k);
    }
    for (const k of this.outerSince.keys()) {
      if (!active.has(k)) this.outerSince.delete(k);
    }
  }

  activeKey(userId: string, venueId: string): string {
    return this.key(userId, venueId);
  }
}
