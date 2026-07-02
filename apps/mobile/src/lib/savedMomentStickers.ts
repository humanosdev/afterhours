import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import type { MomentStickerItem } from "./momentEditor";

const INDEX_KEY = "moment_saved_imessage_stickers";
const STICKER_DIR = `${FileSystem.documentDirectory ?? ""}moment-imessage-stickers/`;

type SavedStickerRow = {
  id: string;
  fileName: string;
  width: number;
  height: number;
  assetId?: string;
};

async function ensureStickerDir() {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(STICKER_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(STICKER_DIR, { intermediates: true });
  }
}

async function readIndex(): Promise<SavedStickerRow[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedStickerRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(rows: SavedStickerRow[]) {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(rows));
}

function toMomentSticker(row: SavedStickerRow): MomentStickerItem {
  return {
    id: row.id,
    assetId: row.assetId,
    uri: `${STICKER_DIR}${row.fileName}`,
    width: row.width,
    height: row.height,
    kind: "sticker",
    source: "device",
    packId: "yours",
    packName: "Yours",
    tags: ["yours", "imessage", "saved"],
  };
}

/** Stickers the user picked from the iMessage sticker drawer in this app. */
export async function loadSavedMomentStickers(): Promise<MomentStickerItem[]> {
  await ensureStickerDir();
  const rows = await readIndex();
  const valid: SavedStickerRow[] = [];

  for (const row of rows) {
    const uri = `${STICKER_DIR}${row.fileName}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) valid.push(row);
  }

  if (valid.length !== rows.length) {
    await writeIndex(valid);
  }

  return valid.map(toMomentSticker);
}

export async function savePickedMomentSticker(input: {
  uri: string;
  width: number;
  height: number;
  assetId?: string;
}): Promise<MomentStickerItem | null> {
  if (!FileSystem.documentDirectory || !input.uri) return null;
  await ensureStickerDir();

  const id = `saved:${input.assetId ?? Date.now()}`;
  const fileName = `${id.replace(/[^a-zA-Z0-9._-]/g, "_")}.png`;
  const destination = `${STICKER_DIR}${fileName}`;

  await FileSystem.copyAsync({ from: input.uri, to: destination });

  const row: SavedStickerRow = {
    id,
    fileName,
    width: input.width,
    height: input.height,
    assetId: input.assetId,
  };

  const rows = await readIndex();
  const next = [row, ...rows.filter((item) => item.id !== row.id)].slice(0, 96);
  await writeIndex(next);

  return toMomentSticker(row);
}
