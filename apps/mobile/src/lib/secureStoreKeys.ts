/** SecureStore keys — alphanumeric, ".", "-", "_" only (no ":"). */
export function secureUserKey(prefix: string, userId: string): string {
  const id = userId.trim();
  if (!id) {
    throw new Error("secureUserKey: userId is required");
  }
  return `${prefix}_${id}`;
}

/** Read from new key, then legacy key that used ":" before the user id. */
export async function secureStoreGetWithLegacy(
  getItem: (key: string) => Promise<string | null>,
  prefix: string,
  userId: string
): Promise<string | null> {
  const next = await getItem(secureUserKey(prefix, userId));
  if (next != null) return next;
  const legacy = `${prefix}:${userId}`;
  return getItem(legacy);
}
