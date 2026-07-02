import {
  MAP_PRESENCE_CLOCK_MS,
  MAP_PRESENCE_POLL_MS,
} from "./backgroundReadPolicy";

export { MAP_PRESENCE_CLOCK_MS, MAP_PRESENCE_POLL_MS };

export type PresenceRefreshBoost = {
  pollMs: number;
  clockMs: number;
};

export const MAP_PRESENCE_REFRESH_BOOST: PresenceRefreshBoost = {
  pollMs: MAP_PRESENCE_POLL_MS,
  clockMs: MAP_PRESENCE_CLOCK_MS,
};
