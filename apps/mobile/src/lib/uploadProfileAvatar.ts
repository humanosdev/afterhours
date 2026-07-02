import { normalizeStoryImageToJpeg } from "./normalizeStoryImage";
import { readLocalImageArrayBuffer } from "./readLocalImageBlob";
import { emitProfileUpdated } from "./profileSyncEvents";
import { supabase } from "./supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

function storageErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("policy")) {
    return "Upload blocked by storage permissions. Check the avatars bucket policies.";
  }
  if (lower.includes("bucket") && lower.includes("not found")) {
    return "The avatars storage bucket is missing in Supabase.";
  }
  if (lower.includes("too large") || lower.includes("size")) {
    return "Image is too large. Try a tighter crop.";
  }
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

/** PWA `/profile/edit` `uploadAvatar` — `avatars` bucket + `profiles.avatar_url`. */
export async function uploadProfileAvatar(
  localUri: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to update your photo." };

  const trimmed = localUri.trim();
  if (!trimmed) return { ok: false, message: "Couldn't read the selected photo." };

  const normalizedUri = await normalizeStoryImageToJpeg(trimmed);
  if (!normalizedUri) {
    return { ok: false, message: "Couldn't process the selected photo." };
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readLocalImageArrayBuffer(normalizedUri);
  } catch {
    return { ok: false, message: "Couldn't read the selected photo." };
  }

  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, message: "Processed image is still too large. Zoom in and try again." };
  }

  const filePath = `${user.id}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, bytes, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

  if (uploadError) {
    return { ok: false, message: storageErrorMessage(uploadError.message || "Upload failed") };
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const baseUrl = urlData.publicUrl?.trim() ?? "";
  if (!baseUrl) {
    return { ok: false, message: "Couldn't get a public URL for the upload." };
  }
  const publicUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, message: "Photo uploaded but profile couldn't be updated." };
  }

  emitProfileUpdated();
  return { ok: true, publicUrl };
}
