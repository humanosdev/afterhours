import type { VenuePublic } from "../types/venue";

let cached: VenuePublic[] | null = null;

export function getCachedVenuesPreview(): VenuePublic[] | null {
  return cached;
}

export function setCachedVenuesPreview(venues: VenuePublic[]): void {
  cached = venues;
}

export function clearCachedVenuesPreview(): void {
  cached = null;
}
