import { useEffect, useRef, useState } from "react";
import { Image, type ImageContentFit } from "expo-image";
import { StyleSheet, View } from "react-native";
import { getCachedStoryDisplayUri } from "../../lib/storyDisplayUriCache";
import { resolveStoryDisplayUri } from "../../lib/storyMediaUri";

type ViewerSlideImageProps = {
  storedUrl: string;
  recyclingKey: string;
  contentFit?: ImageContentFit;
  onReady?: () => void;
};

/** Viewer slide — cached signed URL + disk bitmap; holdover avoids black flash on swipe. */
export function ViewerSlideImage({
  storedUrl,
  recyclingKey,
  contentFit = "cover",
  onReady,
}: ViewerSlideImageProps) {
  const holdoverRef = useRef<string | null>(getCachedStoryDisplayUri(storedUrl));
  const [displayUri, setDisplayUri] = useState<string | null>(() => holdoverRef.current);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedStoryDisplayUri(storedUrl);
    if (cached) {
      holdoverRef.current = cached;
      setDisplayUri(cached);
      onReady?.();
      return;
    }

    void (async () => {
      const resolved = await resolveStoryDisplayUri(storedUrl);
      if (cancelled) return;
      if (!resolved) {
        onReady?.();
        return;
      }
      try {
        await Image.prefetch(resolved, { cachePolicy: "memory-disk" });
      } catch {
        /* best-effort */
      }
      if (!cancelled) {
        holdoverRef.current = resolved;
        setDisplayUri(resolved);
        onReady?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storedUrl, onReady]);

  const uri = displayUri ?? holdoverRef.current;

  return (
    <View style={styles.host}>
      {uri ? (
        <Image
          recyclingKey={recyclingKey}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          onLoad={() => onReady?.()}
          onError={() => onReady?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});
