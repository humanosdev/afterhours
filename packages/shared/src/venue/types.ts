export type VenueForPresenceSync = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  inner_radius_m: number;
  outer_radius_m: number;
  halo_radius_m: number | null;
};

export type VenueZoneType = "inner" | "outer" | "halo";

export type VenuePresenceState = "outside" | "inner_pending" | "inner_confirmed";

export type ComputePresenceFromGpsResult = {
  venueId: string | null;
  zoneType: VenueZoneType | null;
  venueState: string;
  enteredInnerAt: string | null;
};
