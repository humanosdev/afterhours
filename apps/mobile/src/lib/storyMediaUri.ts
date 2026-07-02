import { getCachedStoryDisplayUri, setCachedStoryDisplayUri } from "./storyDisplayUriCache";
import { storiesObjectPathFromUrl } from "./storiesObjectPath";
import { supabase } from "./supabase/client";

export { storiesObjectPathFromUrl } from "./storiesObjectPath";

/**
 * URI safe for remote `Image` / `expo-image` — never `file://`.
 * Uses a signed URL when possible so private buckets still render.
 */
export async function resolveStoryDisplayUri(
  storedUrl: string | null | undefined
): Promise<string | null> {
  const url = storedUrl?.trim() ?? "";
  if (!url) return null;

  const cached = getCachedStoryDisplayUri(url);
  if (cached) return cached;

  if (url.startsWith("file://") || url.startsWith("ph://") || url.startsWith("content://")) {
    setCachedStoryDisplayUri(url, url);
    return url;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (__DEV__) {
      console.warn("[story-media] render blocked non-http uri", url.slice(0, 72));
    }
    return null;
  }

  const path = storiesObjectPathFromUrl(url);
  if (path) {
    const { data, error } = await supabase.storage.from("stories").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) {
      setCachedStoryDisplayUri(url, data.signedUrl);
      return data.signedUrl;
    }
    if (__DEV__ && error) {
      console.warn("[story-media] signed url failed, using stored url", error.message);
    }
  }

  setCachedStoryDisplayUri(url, url);
  return url;
}
