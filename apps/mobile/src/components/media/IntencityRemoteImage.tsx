import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type StyleProp } from "react-native";
import { getCachedStoryDisplayUri } from "../../lib/storyDisplayUriCache";
import { mediaLayout } from "../../theme/mediaLayout";
import { motion } from "../../theme/motion";

export type IntencityRemoteImageProps = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  accessibilityLabel?: string;
  debugLabel?: string;
  /** Resolve URI async (stories); omit for direct HTTP(S). */
  resolveUri?: (uri: string) => Promise<string | null>;
  /** Keep last decoded URI visible while the next one resolves (avatars). Off for story viewer slides. */
  holdoverWhileLoading?: boolean;
  /** Resets recycled native image views when the slide changes (expo-image). */
  recyclingKey?: string;
  /** Fires when display URI is set (signed URL resolved). */
  onUriResolved?: () => void;
  /** Fires when bitmap has decoded (expo-image load). */
  onImageLoad?: () => void;
};

/**
 * Unified remote bitmap renderer — cache, fade, holdover, placeholder.
 * Story and venue surfaces should route through this (via StoryMediaImage / RemoteImage).
 */
export function IntencityRemoteImage({
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  debugLabel,
  resolveUri,
  holdoverWhileLoading = true,
  recyclingKey,
  onUriResolved,
  onImageLoad,
}: IntencityRemoteImageProps) {
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const lastGoodUri = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trimmed = uri?.trim() ?? "";
    if (!holdoverWhileLoading) {
      setDisplayUri(null);
    }
    if (!trimmed) {
      lastGoodUri.current = null;
      setDisplayUri(null);
      return;
    }

    const apply = (resolved: string | null) => {
      if (cancelled) return;
      if (__DEV__ && debugLabel) {
        console.log("[media] render", { label: debugLabel, ok: Boolean(resolved) });
      }
      if (resolved) {
        lastGoodUri.current = resolved;
        setDisplayUri(resolved);
        onUriResolved?.();
      } else if (!holdoverWhileLoading) {
        setDisplayUri(null);
      }
    };

    const cached = getCachedStoryDisplayUri(trimmed);
    if (cached) {
      apply(cached);
      return;
    }

    if (resolveUri) {
      void resolveUri(trimmed).then(apply);
    } else {
      apply(trimmed);
    }

    return () => {
      cancelled = true;
    };
  }, [uri, debugLabel, resolveUri, onUriResolved, holdoverWhileLoading]);

  const shownUri = holdoverWhileLoading ? displayUri ?? lastGoodUri.current : displayUri;

  if (!shownUri) {
    return <View style={[style, styles.placeholder]} accessibilityLabel={accessibilityLabel} />;
  }

  return (
    <Image
      recyclingKey={recyclingKey}
      source={{ uri: shownUri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={recyclingKey ? 0 : motion.fade.image}
      accessibilityLabel={accessibilityLabel}
      onLoad={() => onImageLoad?.()}
      onError={(e) => {
        if (__DEV__) {
          console.warn("[media] decode failed", debugLabel ?? "remote", shownUri.slice(0, 80), e.error);
        }
        onImageLoad?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: mediaLayout.placeholderColor,
  },
});
