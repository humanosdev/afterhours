import { useCallback, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import { MOMENT_BUILTIN_STICKERS } from "../lib/momentDefaultStickers";
import type { MomentStickerItem } from "../lib/momentEditor";
import {
  importIMessageStickerFromPicker,
  loadPersonalMomentStickers,
  resolveMomentStickerUri,
} from "../lib/momentStickers";

export function useMomentStickers(enabled: boolean) {
  const [deviceStickers, setDeviceStickers] = useState<MomentStickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setDeviceStickers([]);
      return;
    }
    setLoading(true);
    try {
      setDeviceStickers(await loadPersonalMomentStickers());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const importFromIMessage = useCallback(async (): Promise<MomentStickerItem | null> => {
    setImporting(true);
    try {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      const sticker = await importIMessageStickerFromPicker();
      if (sticker) {
        setDeviceStickers((prev) => [sticker, ...prev.filter((row) => row.id !== sticker.id)]);
      }
      return sticker;
    } finally {
      setImporting(false);
    }
  }, []);

  const ensureUri = useCallback(async (sticker: MomentStickerItem): Promise<string | null> => {
    if (sticker.source === "builtin" || sticker.badge || sticker.emojiGlyph) {
      return null;
    }
    if (sticker.uri) return sticker.uri;
    const uri = await resolveMomentStickerUri(sticker);
    if (!uri) return null;
    setDeviceStickers((prev) =>
      prev.map((row) => (row.id === sticker.id ? { ...row, uri } : row))
    );
    return uri;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    builtinStickers: MOMENT_BUILTIN_STICKERS,
    deviceStickers,
    loading,
    importing,
    refresh,
    importFromIMessage,
    ensureUri,
  };
};
