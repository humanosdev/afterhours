import { getSupabaseUrl } from "./env";

/** Extract object path inside `stories` bucket from a Supabase storage URL. */
export function storiesObjectPathFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const base = getSupabaseUrl().replace(/\/$/, "");
  const publicPrefix = `${base}/storage/v1/object/public/stories/`;
  if (trimmed.startsWith(publicPrefix)) {
    return decodeURIComponent(trimmed.slice(publicPrefix.length).split("?")[0] ?? "");
  }

  const signPrefix = `${base}/storage/v1/object/sign/stories/`;
  if (trimmed.startsWith(signPrefix)) {
    return decodeURIComponent(trimmed.slice(signPrefix.length).split("?")[0] ?? "");
  }

  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/stories\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
