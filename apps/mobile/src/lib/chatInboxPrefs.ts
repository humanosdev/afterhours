import * as SecureStore from "expo-secure-store";

export type ChatInboxPrefs = {
  hiddenChatIds: Set<string>;
  approvedChatIds: Set<string>;
};

const STORAGE_VERSION = "v1";
const memCache = new Map<string, ChatInboxPrefs>();

function storageKey(userId: string) {
  return `chat_inbox_prefs:${STORAGE_VERSION}:${userId}`;
}

function emptyPrefs(): ChatInboxPrefs {
  return { hiddenChatIds: new Set(), approvedChatIds: new Set() };
}

function parseIdSet(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((x): x is string => typeof x === "string" && x.length > 0));
}

export function getCachedChatInboxPrefs(userId: string): ChatInboxPrefs | null {
  return memCache.get(userId) ?? null;
}

export async function loadChatInboxPrefs(userId: string): Promise<ChatInboxPrefs> {
  const cached = memCache.get(userId);
  if (cached) return cached;

  try {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) {
      const empty = emptyPrefs();
      memCache.set(userId, empty);
      return empty;
    }
    const parsed = JSON.parse(raw) as { hidden?: unknown; approved?: unknown };
    const prefs: ChatInboxPrefs = {
      hiddenChatIds: parseIdSet(parsed.hidden),
      approvedChatIds: parseIdSet(parsed.approved),
    };
    memCache.set(userId, prefs);
    return prefs;
  } catch {
    const empty = emptyPrefs();
    memCache.set(userId, empty);
    return empty;
  }
}

async function persistChatInboxPrefs(userId: string, prefs: ChatInboxPrefs): Promise<void> {
  memCache.set(userId, prefs);
  try {
    await SecureStore.setItemAsync(
      storageKey(userId),
      JSON.stringify({
        hidden: Array.from(prefs.hiddenChatIds),
        approved: Array.from(prefs.approvedChatIds),
      })
    );
  } catch {
    /* unavailable */
  }
}

export async function approveChatInboxRequest(userId: string, chatId: string): Promise<ChatInboxPrefs> {
  const prefs = await loadChatInboxPrefs(userId);
  const next: ChatInboxPrefs = {
    hiddenChatIds: new Set(prefs.hiddenChatIds),
    approvedChatIds: new Set(prefs.approvedChatIds),
  };
  next.approvedChatIds.add(chatId);
  next.hiddenChatIds.delete(chatId);
  await persistChatInboxPrefs(userId, next);
  return next;
}

export async function denyChatInboxRequest(userId: string, chatId: string): Promise<ChatInboxPrefs> {
  const prefs = await loadChatInboxPrefs(userId);
  const next: ChatInboxPrefs = {
    hiddenChatIds: new Set(prefs.hiddenChatIds),
    approvedChatIds: new Set(prefs.approvedChatIds),
  };
  next.hiddenChatIds.add(chatId);
  next.approvedChatIds.delete(chatId);
  await persistChatInboxPrefs(userId, next);
  return next;
}

/** Mirrors web `chat:hidden:{meId}` — hide denied threads from the inbox. */
export function isChatHidden(prefs: ChatInboxPrefs, chatId: string): boolean {
  return prefs.hiddenChatIds.has(chatId);
}

export function isChatRequestApproved(prefs: ChatInboxPrefs, chatId: string): boolean {
  return prefs.approvedChatIds.has(chatId);
}
