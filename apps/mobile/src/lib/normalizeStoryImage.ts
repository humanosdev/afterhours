import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { mediaLayout } from "../theme/mediaLayout";

const LOG = "[story-ingest]";

function log(stage: string, payload: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${LOG} normalize ${stage}`, payload);
  }
}

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

async function logFileInfo(stage: string, uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    log(stage, {
      uri: uri.slice(0, 120),
      exists: info.exists,
      size: info.exists ? info.size : 0,
    });
  } catch (error) {
    log(`${stage}:getInfoAsync_failed`, serializeError(error));
  }
}

/** Copy manipulator output to cache with a guaranteed `.jpg` path. */
async function ensureJpgExtension(uri: string): Promise<string> {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return uri;
  }
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return uri;
  }
  const dest = `${cacheDir}story-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  log("ensure_jpg_copy", { from: uri.slice(0, 80), to: dest.slice(0, 80) });
  return dest;
}

/**
 * Force JPEG bytes — avoids HEIC/raw blobs that RN `Image` cannot decode from storage.
 * Returns normalized URI, or `null` if manipulation fails (caller may upload original bytes).
 */
export async function normalizeStoryImageToJpeg(localUri: string): Promise<string | null> {
  const originalUri = localUri.trim();
  if (!originalUri) {
    log("abort", { reason: "empty_uri" });
    return null;
  }

  log("start", { originalUri: originalUri.slice(0, 120) });
  await logFileInfo("original", originalUri);

  let manipulateResult: ImageManipulator.ImageResult;
  const actions: ImageManipulator.Action[] = [];
  try {
    const probe = await ImageManipulator.manipulateAsync(originalUri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (probe.width && probe.height) {
      const longEdge = Math.max(probe.width, probe.height);
      const max = mediaLayout.ingest.maxLongEdge;
      if (longEdge > max) {
        const scale = max / longEdge;
        actions.push({
          resize: {
            width: Math.max(1, Math.round(probe.width * scale)),
            height: Math.max(1, Math.round(probe.height * scale)),
          },
        });
      }
    }

    manipulateResult = await ImageManipulator.manipulateAsync(originalUri, actions, {
      compress: mediaLayout.ingest.jpegQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    log("manipulate_ok", {
      resultUri: manipulateResult.uri?.slice(0, 120),
      width: manipulateResult.width,
      height: manipulateResult.height,
    });
  } catch (error) {
    log("manipulate_failed", { originalUri: originalUri.slice(0, 120), ...serializeError(error) });
    return null;
  }

  if (!manipulateResult.uri) {
    log("abort", { reason: "no_result_uri" });
    return null;
  }

  let normalizedUri: string;
  try {
    normalizedUri = await ensureJpgExtension(manipulateResult.uri);
  } catch (error) {
    log("ensure_jpg_failed", serializeError(error));
    normalizedUri = manipulateResult.uri;
  }

  await logFileInfo("normalized", normalizedUri);
  log("done", {
    originalUri: originalUri.slice(0, 80),
    normalizedUri: normalizedUri.slice(0, 80),
  });

  return normalizedUri;
}
