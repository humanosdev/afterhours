import * as ImageManipulator from "expo-image-manipulator";
import jpeg from "jpeg-js";
import { mediaLayout } from "../theme/mediaLayout";
import { type ShareAspectFormat } from "./shareAspect";
import { extractImageBackdropColor } from "./imageBackdropColor";

export type ShareCropTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

/** Pixel dimensions after EXIF orientation — matches ImageManipulator export space. */
export async function probeOrientedImageSize(
  localUri: string
): Promise<{ width: number; height: number } | null> {
  const trimmed = localUri.trim();
  if (!trimmed) return null;
  try {
    const probe = await ImageManipulator.manipulateAsync(trimmed, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (probe.width && probe.height) {
      return { width: probe.width, height: probe.height };
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** IG-style pinch — high zoom without preview softening (export uses full source). */
export const MAX_CROP_ZOOM = 8;
/** Pinch out past "full image visible" — smaller photo on matte (IG new post). */
export const MIN_CROP_ZOOM = 0.35;

export type CropDisplayLayout = {
  displayW: number;
  displayH: number;
  left: number;
  top: number;
  scale: number;
  zoom: number;
};

type CropRect = { originX: number; originY: number; width: number; height: number };

/** Minimum pinch zoom — cover-fill can zoom out to reveal the full image. */
export function cropPanZoomMinZoom(
  imageW: number,
  imageH: number,
  windowW: number,
  windowH: number,
  coverFill: boolean
): number {
  if (imageW <= 0 || imageH <= 0 || windowW <= 0 || windowH <= 0) return 1;
  if (!coverFill) return MIN_CROP_ZOOM;
  const cover = Math.max(windowW / imageW, windowH / imageH);
  const contain = Math.min(windowW / imageW, windowH / imageH);
  const fitMin = contain / cover;
  return Math.min(fitMin, MIN_CROP_ZOOM);
}

export function clampCropZoom(
  zoom: number,
  imageW: number,
  imageH: number,
  windowW: number,
  windowH: number,
  coverFill: boolean
): number {
  const min = cropPanZoomMinZoom(imageW, imageH, windowW, windowH, coverFill);
  return Math.min(MAX_CROP_ZOOM, Math.max(min, zoom));
}

/** Preview + export geometry for pan/zoom crop. */
export function cropDisplayLayout(
  imageWidth: number,
  imageHeight: number,
  cropWindowWidth: number,
  cropWindowHeight: number,
  transform: ShareCropTransform,
  coverFill = true
): CropDisplayLayout {
  const zoom = clampCropZoom(
    transform.zoom,
    imageWidth,
    imageHeight,
    cropWindowWidth,
    cropWindowHeight,
    coverFill
  );
  const baseScale = coverFill
    ? Math.max(cropWindowWidth / imageWidth, cropWindowHeight / imageHeight)
    : Math.min(cropWindowWidth / imageWidth, cropWindowHeight / imageHeight);
  const scale = baseScale * zoom;
  const displayW = imageWidth * scale;
  const displayH = imageHeight * scale;
  return {
    displayW,
    displayH,
    left: (cropWindowWidth - displayW) / 2 + transform.offsetX,
    top: (cropWindowHeight - displayH) / 2 + transform.offsetY,
    scale,
    zoom,
  };
}

export function cropHasLetterbox(
  layout: CropDisplayLayout,
  cropWindowWidth: number,
  cropWindowHeight: number
): boolean {
  const eps = 0.5;
  return (
    layout.left > eps ||
    layout.top > eps ||
    layout.left + layout.displayW < cropWindowWidth - eps ||
    layout.top + layout.displayH < cropWindowHeight - eps
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 20, g: 24, b: 32 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function blitRgba(
  dest: Uint8Array,
  destW: number,
  destH: number,
  src: Uint8Array,
  srcW: number,
  srcH: number,
  destX: number,
  destY: number
) {
  for (let sy = 0; sy < srcH; sy++) {
    for (let sx = 0; sx < srcW; sx++) {
      const dx = destX + sx;
      const dy = destY + sy;
      if (dx < 0 || dy < 0 || dx >= destW || dy >= destH) continue;
      const si = (sy * srcW + sx) * 4;
      if (src[si + 3] < 128) continue;
      const di = (dy * destW + dx) * 4;
      dest[di] = src[si];
      dest[di + 1] = src[si + 1];
      dest[di + 2] = src[si + 2];
      dest[di + 3] = 255;
    }
  }
}

function outputDimensions(
  cropWindowWidth: number,
  cropWindowHeight: number,
  maxLongEdge: number
): { width: number; height: number; scale: number } {
  const long = Math.max(cropWindowWidth, cropWindowHeight);
  const scale = long > maxLongEdge ? maxLongEdge / long : 1;
  return {
    width: Math.max(1, Math.round(cropWindowWidth * scale)),
    height: Math.max(1, Math.round(cropWindowHeight * scale)),
    scale,
  };
}

/** WYSIWYG export with photo-derived matte when the image does not fill the crop frame. */
export async function exportPanZoomComposite(
  localUri: string,
  cropWindowWidth: number,
  cropWindowHeight: number,
  transform: ShareCropTransform,
  imageWidth: number,
  imageHeight: number,
  coverFill: boolean,
  maxLongEdge: number
): Promise<string | null> {
  const layout = cropDisplayLayout(
    imageWidth,
    imageHeight,
    cropWindowWidth,
    cropWindowHeight,
    transform,
    coverFill
  );
  const out = outputDimensions(cropWindowWidth, cropWindowHeight, maxLongEdge);
  const outScale = out.scale;
  const imgW = Math.max(1, Math.round(layout.displayW * outScale));
  const imgH = Math.max(1, Math.round(layout.displayH * outScale));
  const imgLeft = Math.round(layout.left * outScale);
  const imgTop = Math.round(layout.top * outScale);

  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: imgW, height: imgH } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!resized.base64) return null;

  const backdropHex = await extractImageBackdropColor(localUri);
  const { r, g, b } = hexToRgb(backdropHex);
  const frame = new Uint8Array(out.width * out.height * 4);
  for (let i = 0; i < frame.length; i += 4) {
    frame[i] = r;
    frame[i + 1] = g;
    frame[i + 2] = b;
    frame[i + 3] = 255;
  }

  const decoded = jpeg.decode(base64ToUint8Array(resized.base64), { useTArray: true });
  blitRgba(frame, out.width, out.height, decoded.data, decoded.width, decoded.height, imgLeft, imgTop);

  const encoded = jpeg.encode(
    { data: frame, width: out.width, height: out.height },
    mediaLayout.ingest.jpegQuality * 100
  );

  const { writeAsStringAsync, cacheDirectory, EncodingType } = await import("expo-file-system/legacy");
  const dest = `${cacheDirectory}crop-${Date.now()}.jpg`;
  await writeAsStringAsync(dest, uint8ToBase64(encoded.data), {
    encoding: EncodingType.Base64,
  });
  return dest;
}

/**
 * Map pan/zoom in the crop viewport to a pixel rect in the source image.
 */
export function cropRectFromPanZoom(
  imageWidth: number,
  imageHeight: number,
  cropWindowWidth: number,
  cropWindowHeight: number,
  transform: ShareCropTransform,
  coverFill = true
): CropRect {
  const zoom = clampCropZoom(
    transform.zoom,
    imageWidth,
    imageHeight,
    cropWindowWidth,
    cropWindowHeight,
    coverFill
  );
  const baseScale = coverFill
    ? Math.max(cropWindowWidth / imageWidth, cropWindowHeight / imageHeight)
    : Math.min(cropWindowWidth / imageWidth, cropWindowHeight / imageHeight);
  const scale = baseScale * zoom;
  const displayW = imageWidth * scale;
  const displayH = imageHeight * scale;
  const left = (cropWindowWidth - displayW) / 2 + transform.offsetX;
  const top = (cropWindowHeight - displayH) / 2 + transform.offsetY;

  let originX = Math.round((0 - left) / scale);
  let originY = Math.round((0 - top) / scale);
  let width = Math.round(cropWindowWidth / scale);
  let height = Math.round(cropWindowHeight / scale);

  if (originX < 0) {
    width += originX;
    originX = 0;
  }
  if (originY < 0) {
    height += originY;
    originY = 0;
  }
  width = Math.min(width, imageWidth - originX);
  height = Math.min(height, imageHeight - originY);

  return {
    originX: Math.max(0, originX),
    originY: Math.max(0, originY),
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function scaleDownIfNeeded(width: number, height: number): { width: number; height: number } | null {
  const longEdge = Math.max(width, height);
  const max = mediaLayout.ingest.maxLongEdge;
  if (longEdge <= max) return null;
  const s = max / longEdge;
  return {
    width: Math.max(1, Math.round(width * s)),
    height: Math.max(1, Math.round(height * s)),
  };
}

/** Export share JPEG cropped to IG aspect with user pan/zoom. */
export async function exportShareCrop(
  localUri: string,
  _format: ShareAspectFormat,
  cropWindowWidth: number,
  cropWindowHeight: number,
  transform: ShareCropTransform
): Promise<string | null> {
  const trimmed = localUri.trim();
  if (!trimmed) return null;

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
      true
    );

    if (cropHasLetterbox(layout, cropWindowWidth, cropWindowHeight)) {
      return exportPanZoomComposite(
        trimmed,
        cropWindowWidth,
        cropWindowHeight,
        transform,
        imageWidth,
        imageHeight,
        true,
        mediaLayout.ingest.maxLongEdge
      );
    }

    const crop = cropRectFromPanZoom(
      imageWidth,
      imageHeight,
      cropWindowWidth,
      cropWindowHeight,
      transform
    );

    const actions: ImageManipulator.Action[] = [{ crop }];
    const resized = scaleDownIfNeeded(crop.width, crop.height);
    if (resized) actions.push({ resize: resized });

    const result = await ImageManipulator.manipulateAsync(trimmed, actions, {
      compress: mediaLayout.ingest.jpegQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri ?? null;
  } catch {
    return null;
  }
}
