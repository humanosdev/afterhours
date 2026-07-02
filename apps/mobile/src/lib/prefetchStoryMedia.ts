import { Image } from "expo-image";
import { resolveStoryDisplayUri } from "./storyMediaUri";

/** Warm signed URL + disk cache before the slide becomes active. */
export async function prefetchStoryMediaUri(storedUrl: string | null | undefined): Promise<void> {
  const resolved = await resolveStoryDisplayUri(storedUrl);
  if (!resolved) return;
  try {
    await Image.prefetch(resolved, { cachePolicy: "memory-disk" });
  } catch {
    /* best-effort */
  }
}
