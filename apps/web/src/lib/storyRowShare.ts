/**
 * Normalize `stories.is_share` from PostgREST/JSON (boolean, 0/1, or string).
 * Avoids JS pitfalls like `!!"false" === true` or `if (row.is_share)` treating `"false"` as truthy.
 */
export function isStoryRowShareFlag(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === 1) return true;
  if (typeof raw === "string") {
    const t = raw.trim().toLowerCase();
    return t === "true" || t === "t" || t === "1";
  }
  return false;
}
