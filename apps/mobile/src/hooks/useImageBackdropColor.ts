import { useEffect, useState } from "react";
import { extractImageBackdropColor } from "../lib/imageBackdropColor";
import { mediaLayout } from "../theme/mediaLayout";

/** Solid letterbox / backdrop color derived from the chosen photo. */
export function useImageBackdropColor(uri: string | null | undefined): string {
  const [color, setColor] = useState<string>(mediaLayout.placeholderColor);

  useEffect(() => {
    if (!uri) {
      setColor(mediaLayout.placeholderColor);
      return;
    }

    let cancelled = false;
    setColor(mediaLayout.placeholderColor);
    void extractImageBackdropColor(uri).then((next) => {
      if (!cancelled) setColor(next);
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return color;
}
