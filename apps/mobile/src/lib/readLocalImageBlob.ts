import * as FileSystem from "expo-file-system/legacy";

const LOG = "[story-ingest]";

function log(stage: string, payload: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`${LOG} read ${stage}`, payload);
  }
}

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function inferMimeType(uri: string): string {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/** Base64 → bytes without `fetch(file://)` (unreliable on physical iOS). */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const atobFn = globalThis.atob;
  if (!atobFn) {
    throw new Error("read_failed:no_atob");
  }
  const binary = atobFn(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function logFileInfo(stage: string, uri: string): Promise<FileSystem.FileInfo> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    log(stage, {
      uri: uri.slice(0, 120),
      exists: info.exists,
      size: info.exists ? info.size : 0,
      isDirectory: info.exists ? info.isDirectory : false,
      mimeType: inferMimeType(uri),
    });
    return info;
  } catch (error) {
    log(`${stage}:getInfoAsync_failed`, serializeError(error));
    throw error;
  }
}

async function readUriViaFileSystemBase64(uri: string): Promise<ArrayBuffer> {
  const trimmed = uri.trim();
  await logFileInfo("before_read", trimmed);

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(trimmed, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    log("readAsStringAsync_failed", { uri: trimmed.slice(0, 120), ...serializeError(error) });
    throw error;
  }

  if (!base64?.length) {
    throw new Error("read_failed:empty_base64");
  }

  let buffer: ArrayBuffer;
  try {
    buffer = base64ToArrayBuffer(base64);
  } catch (error) {
    log("base64_to_arraybuffer_failed", {
      base64Length: base64.length,
      ...serializeError(error),
    });
    throw error;
  }

  log("read_ok", {
    uri: trimmed.slice(0, 120),
    base64Length: base64.length,
    byteLength: buffer.byteLength,
    mimeType: inferMimeType(trimmed),
  });

  if (!buffer.byteLength) {
    throw new Error("read_failed:empty");
  }

  return buffer;
}

/** XHR fallback for schemes FileSystem may not handle (e.g. some `ph://`). Never used for `file://`. */
function readUriViaXhr(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const blob = xhr.response as Blob | null;
      if (blob && blob.size > 0) {
        resolve(blob);
      } else {
        reject(new Error("read_failed:empty"));
      }
    };
    xhr.onerror = () => reject(new Error("read_failed:xhr"));
    xhr.responseType = "blob";
    xhr.open("GET", uri);
    xhr.send();
  });
}

/**
 * Read a local camera/picker URI into bytes for Supabase upload.
 * Physical iOS: use native FileSystem base64 reads — not `fetch(file://)` or XHR on `file://`.
 */
export async function readLocalImageArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  const uri = localUri.trim();
  if (!uri) {
    throw new Error("read_failed:empty_uri");
  }

  log("start", { uri: uri.slice(0, 120), scheme: uri.split(":")[0] });

  if (uri.startsWith("file://")) {
    return readUriViaFileSystemBase64(uri);
  }

  if (uri.startsWith("content://")) {
    try {
      return await readUriViaFileSystemBase64(uri);
    } catch (firstError) {
      log("content_filesystem_fallback_xhr", serializeError(firstError));
      const blob = await readUriViaXhr(uri);
      return blob.arrayBuffer();
    }
  }

  if (uri.startsWith("ph://")) {
    try {
      return await readUriViaFileSystemBase64(uri);
    } catch (firstError) {
      log("ph_filesystem_fallback_xhr", serializeError(firstError));
      const blob = await readUriViaXhr(uri);
      return blob.arrayBuffer();
    }
  }

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`read_failed:${response.status}`);
    }
    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("read_failed:empty");
    }
    return blob.arrayBuffer();
  }

  try {
    return await readUriViaFileSystemBase64(uri);
  } catch (error) {
    log("unknown_scheme_filesystem_failed", serializeError(error));
    throw error;
  }
}

/** @deprecated Prefer `readLocalImageArrayBuffer` — kept for callers that need Blob. */
export async function readLocalImageBlob(localUri: string): Promise<Blob> {
  const buffer = await readLocalImageArrayBuffer(localUri);
  return new Blob([buffer], { type: inferMimeType(localUri) });
}
