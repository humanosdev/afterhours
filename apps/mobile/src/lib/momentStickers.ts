import {
  isIMessageStickersNativeAvailable,
  pickNativeIMessageSticker,
  resolveNativeStickerUri,
} from "intencity-message-stickers";
import { Alert, Platform } from "react-native";
import { MOMENT_BUILTIN_STICKERS } from "./momentDefaultStickers";
import type { MomentStickerItem } from "./momentEditor";
import { loadSavedMomentStickers, savePickedMomentSticker } from "./savedMomentStickers";

const uriCache = new Map<string, string>();

/** Stickers the user picked via + iMessage in this app (local files, no lazy resolve). */
export async function loadPersonalMomentStickers(): Promise<MomentStickerItem[]> {
  return loadSavedMomentStickers();
}

/** Built-in packs plus personal stickers. */
export async function loadMomentStickers(): Promise<MomentStickerItem[]> {
  const personal = await loadPersonalMomentStickers();
  return [...MOMENT_BUILTIN_STICKERS, ...personal];
}

export async function importIMessageStickerFromPicker(): Promise<MomentStickerItem | null> {
  if (Platform.OS !== "ios") {
    Alert.alert("Stickers", "iMessage stickers are only available on iOS.");
    return null;
  }

  if (!isIMessageStickersNativeAvailable()) {
    Alert.alert(
      "Stickers",
      "The iMessage sticker picker needs a native build. Run npx expo run:ios, then try again."
    );
    return null;
  }

  try {
    const picked = await pickNativeIMessageSticker();
    if (!picked?.uri) return null;

    return savePickedMomentSticker({
      uri: picked.uri,
      width: picked.width ?? 512,
      height: picked.height ?? 512,
      assetId: picked.assetId,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[moment-stickers] iMessage picker failed", error);
    }
    Alert.alert(
      "Stickers",
      "Could not open the sticker picker. Close and reopen the composer, then try again."
    );
    return null;
  }
}

export async function resolveMomentStickerUri(
  sticker: Pick<MomentStickerItem, "assetId" | "id" | "source" | "uri">
): Promise<string | null> {
  if (sticker.uri && sticker.id.startsWith("saved:")) {
    return sticker.uri;
  }

  if (sticker.source === "builtin" || !sticker.assetId) {
    return sticker.uri ?? null;
  }

  const cached = uriCache.get(sticker.assetId);
  if (cached) return cached;

  const uri = await resolveNativeStickerUri(sticker.assetId);
  if (uri) uriCache.set(sticker.assetId, uri);
  return uri;
}
