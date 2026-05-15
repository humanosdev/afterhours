export type RecentSearchKind = "user" | "venue";

export type RecentSearchItem = {
  kind: RecentSearchKind;
  id: string;
  label: string;
  /** @username without @ for users */
  subtitle?: string;
  at: number;
};

const STORAGE_KEY = "ah_recent_discovery_searches_v1";
const MAX_ITEMS = 10;

function storageKeyForUser(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

function readRaw(userId: string): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentSearchItem =>
          !!x &&
          typeof x === "object" &&
          (x as RecentSearchItem).kind !== undefined &&
          typeof (x as RecentSearchItem).id === "string" &&
          typeof (x as RecentSearchItem).label === "string" &&
          typeof (x as RecentSearchItem).at === "number"
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeRaw(userId: string, items: RecentSearchItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode */
  }
}

export function getRecentDiscoverySearches(userId: string): RecentSearchItem[] {
  return readRaw(userId)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ITEMS);
}

export function pushRecentDiscoverySearch(
  userId: string,
  next: Omit<RecentSearchItem, "at"> & { at?: number }
): RecentSearchItem[] {
  const at = next.at ?? Date.now();
  const dedupeKey = `${next.kind}:${next.id}`;
  const prev = readRaw(userId).filter((x) => `${x.kind}:${x.id}` !== dedupeKey);
  const row: RecentSearchItem = {
    kind: next.kind,
    id: next.id,
    label: next.label,
    subtitle: next.subtitle,
    at,
  };
  const merged = [row, ...prev].sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS);
  writeRaw(userId, merged);
  return merged;
}
