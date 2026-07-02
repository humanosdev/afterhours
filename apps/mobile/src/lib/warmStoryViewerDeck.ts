import { Image } from "expo-image";
import type { StoryViewerStory } from "./storyViewerTypes";
import { resolveStoryDisplayUri } from "./storyMediaUri";

/** Resolve + disk-cache a story deck before / while the viewer is open (IG-style). */
export async function warmStoryViewerDeck(stories: ReadonlyArray<StoryViewerStory>): Promise<void> {
  const urls = stories.map((s) => s.media_url?.trim()).filter(Boolean) as string[];
  if (urls.length === 0) return;

  await Promise.all(
    urls.map(async (stored) => {
      const resolved = await resolveStoryDisplayUri(stored);
      if (!resolved) return;
      try {
        await Image.prefetch(resolved, { cachePolicy: "memory-disk" });
      } catch {
        /* best-effort */
      }
    })
  );
}

/** Fire-and-forget warm — used on hub rail hover / viewer open. */
export function warmStoryViewerDeckAsync(stories: ReadonlyArray<StoryViewerStory>): void {
  void warmStoryViewerDeck(stories);
}
