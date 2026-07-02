/** Resolve story image URL from row — PWA uses `image_url` only in queries. */
export function storyImageUrlFromRow(row: {
  image_url?: string | null;
  media_url?: string | null;
}): string {
  const image = String(row.image_url ?? "").trim();
  if (image) return image;
  return String(row.media_url ?? "").trim();
}
