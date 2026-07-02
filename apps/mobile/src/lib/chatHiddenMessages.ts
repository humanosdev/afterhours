import * as SecureStore from "expo-secure-store";

function storageKey(chatId: string, meId: string): string {
  return `chat_hidden_${chatId}_${meId}`;
}

export async function loadHiddenMessageIds(chatId: string, meId: string): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(chatId, meId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function persistHiddenMessageIds(
  chatId: string,
  meId: string,
  ids: Set<string>
): Promise<void> {
  const key = storageKey(chatId, meId);
  if (ids.size === 0) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, JSON.stringify(Array.from(ids)));
}
