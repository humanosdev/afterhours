/**
 * Client-only search over already-hydrated rows (Phase 2O) — no network, no Supabase.
 */

export function normalizeLocalSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function tokensFromQuery(query: string): string[] {
  const n = normalizeLocalSearchQuery(query);
  if (!n) return [];
  return n.split(/\s+/).filter(Boolean);
}

/**
 * Every non-empty token must appear somewhere in the combined haystacks (substring match).
 * Empty / whitespace query → matches all (`true`).
 */
export function matchesLocalSearch(query: string, ...haystacks: (string | null | undefined)[]): boolean {
  const tokens = tokensFromQuery(query);
  if (tokens.length === 0) return true;
  const blob = haystacks
    .map((h) => (typeof h === "string" ? h : ""))
    .join(" \n ")
    .toLowerCase();
  return tokens.every((t) => blob.includes(t));
}
