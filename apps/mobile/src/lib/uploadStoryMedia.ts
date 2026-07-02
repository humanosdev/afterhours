import { normalizeStoryImageToJpeg } from "./normalizeStoryImage";
import { readLocalImageArrayBuffer } from "./readLocalImageBlob";
import { supabase } from "./supabase/client";
import type { ShareAspectFormat } from "./shareAspect";
import type { ComposerMode } from "./uploadStoryMediaTypes";

export type { ComposerMode } from "./uploadStoryMediaTypes";

const LOG = "[story-ingest]";

function log(stage: string, payload: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${LOG} upload ${stage}`, payload);
  }
}

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

async function readBytesWithFallback(
  primaryUri: string,
  fallbackUri: string
): Promise<{ bytes: ArrayBuffer; sourceUri: string } | null> {
  for (const uri of [primaryUri, fallbackUri]) {
    if (!uri) continue;
    try {
      const bytes = await readLocalImageArrayBuffer(uri);
      if (bytes.byteLength > 0) {
        return { bytes, sourceUri: uri };
      }
      log("read_empty", { uri: uri.slice(0, 120) });
    } catch (error) {
      log("read_failed", { uri: uri.slice(0, 120), ...serializeError(error) });
    }
  }
  return null;
}

/** Upload picked image to `stories` bucket and insert row — mirrors web `StoryCameraModal.postStory`. */
export async function uploadStoryFromUri(
  localUri: string,
  mode: ComposerMode,
  opts?: { shareAspect?: ShareAspectFormat }
): Promise<{ ok: true; imageUrl: string } | { ok: false; message: string; code?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not signed in", code: "auth" };

    const originalUri = localUri.trim();
    if (!originalUri) {
      return { ok: false, message: "read_failed", code: "read_failed" };
    }

    if (__DEV__) {
      console.log("[story-media] capture localUri", originalUri.slice(0, 80));
    }

    const normalizedUri = await normalizeStoryImageToJpeg(originalUri);
    if (!normalizedUri) {
      log("normalize_failed", { originalUri: originalUri.slice(0, 120) });
      return { ok: false, message: "read_failed", code: "read_failed" };
    }

    const readResult = await readBytesWithFallback(normalizedUri, normalizedUri);
    if (!readResult) {
      return { ok: false, message: "read_failed", code: "read_failed" };
    }

    const { bytes, sourceUri } = readResult;
    log("bytes_ready", {
      byteLength: bytes.byteLength,
      usedNormalize: Boolean(normalizedUri && sourceUri === normalizedUri),
      sourceUri: sourceUri.slice(0, 120),
    });

    const filePath = `${user.id}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage.from("stories").upload(filePath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      return { ok: false, message: uploadError.message, code: "upload" };
    }

    const { data: urlData } = supabase.storage.from("stories").getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl?.trim() ?? "";
    if (!imageUrl) {
      return { ok: false, message: "upload", code: "upload" };
    }

    if (__DEV__) {
      const { data: signed } = await supabase.storage.from("stories").createSignedUrl(filePath, 120);
      const verifyUrl = signed?.signedUrl ?? imageUrl;
      let verifyStatus = 0;
      try {
        const head = await fetch(verifyUrl, { method: "HEAD" });
        verifyStatus = head.status;
      } catch {
        verifyStatus = -1;
      }
      console.log("[story-media] upload", {
        mode,
        storagePath: filePath,
        byteSize: bytes.byteLength,
        publicUrl: imageUrl.slice(0, 96),
        verifyStatus,
        normalized: Boolean(normalizedUri),
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const basePayload = {
      user_id: user.id,
      image_url: imageUrl,
      created_at: now.toISOString(),
      expires_at: mode === "shares" ? null : expiresAt.toISOString(),
    };

    const sharePayload = {
      ...basePayload,
      media_url: imageUrl,
      is_share: true,
      share_visible: true,
      share_hidden: false,
      share_aspect: opts?.shareAspect ?? "portrait",
    };
    const momentPayload = { ...basePayload, media_url: imageUrl, is_share: false };

    let insertError = (await supabase.from("stories").insert(mode === "shares" ? sharePayload : momentPayload))
      .error;

    const insertMsg = insertError?.message ?? "";
    if (insertMsg.includes("media_url")) {
      const withoutMediaUrl =
        mode === "shares"
          ? {
              ...basePayload,
              is_share: true,
              share_visible: true,
              share_hidden: false,
              share_aspect: opts?.shareAspect ?? "portrait",
            }
          : { ...basePayload, is_share: false };
      insertError = (await supabase.from("stories").insert(withoutMediaUrl)).error;
    }

    if (
      insertError?.message?.includes("is_share") ||
      insertError?.message?.includes("share_visible") ||
      insertError?.message?.includes("share_aspect")
    ) {
      const legacyShare = {
        ...basePayload,
        is_share: true,
        share_visible: true,
        share_hidden: false,
      };
      const legacy =
        mode === "shares"
          ? legacyShare
          : { ...basePayload, expires_at: expiresAt.toISOString() };
      insertError = (await supabase.from("stories").insert(legacy)).error;
    }

    if (insertError) {
      if (__DEV__) {
        console.warn("[story-media] insert failed", insertError.message);
      }
      return { ok: false, message: insertError.message, code: "insert" };
    }

    if (__DEV__) {
      console.log("[story-media] db image_url", imageUrl.slice(0, 96));
    }

    return { ok: true, imageUrl };
  } catch (e) {
    const err = serializeError(e);
    log("unexpected", err);
    return { ok: false, message: err.message, code: "unknown" };
  }
}
