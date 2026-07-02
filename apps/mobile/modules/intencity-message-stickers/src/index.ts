import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeStickerRow = {
  id: string;
  width: number;
  height: number;
};

export type NativePickedSticker = {
  uri: string;
  width: number;
  height: number;
  assetId?: string;
};

type IntencityMessageStickersModule = {
  loadStickers: (limit: number) => Promise<NativeStickerRow[]>;
  getStickerUri: (assetId: string) => Promise<string | null>;
  pickSticker: () => Promise<NativePickedSticker | Record<string, never>>;
};

const Native = requireOptionalNativeModule<IntencityMessageStickersModule>(
  "IntencityMessageStickers"
);

export function isIMessageStickersNativeAvailable(): boolean {
  return Native != null;
}

export async function loadNativeStickerCatalog(limit = 80): Promise<NativeStickerRow[]> {
  if (!Native) return [];
  try {
    const rows = await Native.loadStickers(limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Opens the same iMessage sticker drawer Apple uses in Messages (iOS 17+). */
export async function pickNativeIMessageSticker(): Promise<NativePickedSticker | null> {
  if (!Native) {
    throw new Error("native_unavailable");
  }
  const row = await Native.pickSticker();
  if (!row || typeof row !== "object" || !("uri" in row) || !row.uri) {
    return null;
  }
  return {
    uri: String(row.uri),
    width: Number(row.width ?? 512),
    height: Number(row.height ?? 512),
    assetId: row.assetId ? String(row.assetId) : undefined,
  };
}

export async function resolveNativeStickerUri(assetId: string): Promise<string | null> {
  if (!Native || !assetId.trim()) return null;
  try {
    const uri = await Native.getStickerUri(assetId);
    return uri?.trim() || null;
  } catch {
    return null;
  }
}
