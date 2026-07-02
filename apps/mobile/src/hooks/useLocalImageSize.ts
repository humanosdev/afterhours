import { useCallback, useEffect, useState } from "react";
import { probeOrientedImageSize } from "../lib/shareCropExport";

export type LocalImageSize = { w: number; h: number };

type ImageLoadPayload = {
  source: { width: number; height: number };
};

/** Resolve local image dimensions — EXIF-oriented probe matches export/crop math. */
export function useLocalImageSize(
  uri: string,
  known?: { width: number; height: number } | null
) {
  const [imageSize, setImageSize] = useState<LocalImageSize | null>(() => toSize(known));

  useEffect(() => {
    const hint = toSize(known);
    if (hint) {
      setImageSize(hint);
      return;
    }

    let cancelled = false;
    void probeOrientedImageSize(uri).then((probed) => {
      if (!cancelled && probed) {
        setImageSize({ w: probed.width, h: probed.height });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uri, known?.width, known?.height]);

  const onImageLoad = useCallback((event: ImageLoadPayload) => {
    const { width, height } = event.source;
    if (width > 0 && height > 0) {
      setImageSize({ w: width, h: height });
    }
  }, []);

  return { imageSize, onImageLoad };
}

function toSize(known?: { width: number; height: number } | null): LocalImageSize | null {
  if (!known || known.width <= 0 || known.height <= 0) return null;
  return { w: known.width, h: known.height };
}
