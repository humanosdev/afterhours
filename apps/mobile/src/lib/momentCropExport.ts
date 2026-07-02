import * as ImageManipulator from "expo-image-manipulator";
import {
  cropDisplayLayout,
  cropHasLetterbox,
  cropRectFromPanZoom,
  exportPanZoomComposite,
  probeOrientedImageSize,
  type ShareCropTransform,
} from "./shareCropExport";
import { mediaLayout } from "../theme/mediaLayout";

/** Export moment JPEG — 9:16 crop from pan/zoom in the preview window (no view-shot re-encode). */
export async function exportMomentCrop(
  localUri: string,
  cropWindowWidth: number,
  cropWindowHeight: number,
  transform: ShareCropTransform,
  coverFill = true
): Promise<string | null> {
  const trimmed = localUri.trim();
  if (!trimmed || cropWindowWidth <= 0 || cropWindowHeight <= 0) return null;

  try {
    const probed = await probeOrientedImageSize(trimmed);
    if (!probed) return null;
    const imageWidth = probed.width;
    const imageHeight = probed.height;

    const layout = cropDisplayLayout(
      imageWidth,
      imageHeight,
      cropWindowWidth,
      cropWindowHeight,
      transform,
      coverFill
    );

    if (cropHasLetterbox(layout, cropWindowWidth, cropWindowHeight)) {
      return exportPanZoomComposite(
        trimmed,
        cropWindowWidth,
        cropWindowHeight,
        transform,
        imageWidth,
        imageHeight,
        coverFill,
        mediaLayout.ingest.momentPublishLongEdge
      );
    }

    const crop = cropRectFromPanZoom(
      imageWidth,
      imageHeight,
      cropWindowWidth,
      cropWindowHeight,
      transform,
      coverFill
    );

    const actions: ImageManipulator.Action[] = [{ crop }];
    const longEdge = Math.max(crop.width, crop.height);
    const max = mediaLayout.ingest.momentPublishLongEdge;
    if (longEdge > max) {
      const scale = max / longEdge;
      actions.push({
        resize: {
          width: Math.max(1, Math.round(crop.width * scale)),
          height: Math.max(1, Math.round(crop.height * scale)),
        },
      });
    }

    const result = await ImageManipulator.manipulateAsync(trimmed, actions, {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri ?? null;
  } catch {
    return null;
  }
}
