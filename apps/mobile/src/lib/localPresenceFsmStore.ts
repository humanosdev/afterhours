import * as SecureStore from "expo-secure-store";
import { EMPTY_LOCAL_FSM, type LocalPresenceFsmState } from "./localPresencePreview";
import type { UserPresenceRow } from "../types/presence";

const memory = new Map<string, LocalPresenceFsmState>();

function storageKey(userId: string): string {
  return `local_presence_fsm:${userId}`;
}

export function readLocalPresenceFsm(userId: string | null | undefined): LocalPresenceFsmState {
  if (!userId) return EMPTY_LOCAL_FSM;
  return memory.get(userId) ?? EMPTY_LOCAL_FSM;
}

export function writeLocalPresenceFsm(userId: string, fsm: LocalPresenceFsmState): void {
  memory.set(userId, fsm);
  void SecureStore.setItemAsync(storageKey(userId), JSON.stringify(fsm)).catch(() => {});
}

export function clearLocalPresenceFsm(userId: string): void {
  memory.delete(userId);
  void SecureStore.deleteItemAsync(storageKey(userId)).catch(() => {});
}

/** Restore session FSM after cold start (map remount / app reopen). */
export async function hydrateLocalPresenceFsm(userId: string): Promise<LocalPresenceFsmState> {
  const cached = memory.get(userId);
  if (cached) return cached;

  try {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) return EMPTY_LOCAL_FSM;
    const parsed = JSON.parse(raw) as LocalPresenceFsmState;
    if (!parsed?.venueState) return EMPTY_LOCAL_FSM;
    memory.set(userId, parsed);
    return parsed;
  } catch {
    return EMPTY_LOCAL_FSM;
  }
}

export function fsmFromPresenceRow(row: UserPresenceRow | null | undefined): LocalPresenceFsmState | null {
  if (!row?.venue_state || row.venue_state === "outside") return null;
  return {
    venueState: row.venue_state,
    enteredInnerAt: row.entered_inner_at ?? null,
  };
}

/** Cold open — prefer confirmed DB/persisted dwell; do not restart 90s pending. */
export function resolveBootLocalPresenceFsm(
  userId: string | null | undefined,
  presenceRow: UserPresenceRow | null | undefined
): LocalPresenceFsmState {
  const persisted = readLocalPresenceFsm(userId);
  const fromDb = fsmFromPresenceRow(presenceRow);
  if (fromDb?.venueState === "inner_confirmed") return fromDb;
  if (persisted.venueState === "inner_confirmed") return persisted;
  if (fromDb && fromDb.venueState !== "outside") return fromDb;
  if (persisted.venueState !== "outside") return persisted;
  return EMPTY_LOCAL_FSM;
}
