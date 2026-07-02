/** Phase 2 cutover — native is the sole production `user_presence` writer. */
export const PRESENCE_WRITE_AUTHORITY = "native" as const;

export type PresenceWriteAuthority = typeof PRESENCE_WRITE_AUTHORITY | "web";

/** Web AppShell + `/map` must not upsert presence when native owns writes. */
export function isWebPresenceWriteRetired(): boolean {
  return PRESENCE_WRITE_AUTHORITY === "native";
}

/** Native app always writes presence in foreground (no per-user env flag). */
export function isNativePresenceWriteEnabled(): boolean {
  return PRESENCE_WRITE_AUTHORITY === "native";
}
