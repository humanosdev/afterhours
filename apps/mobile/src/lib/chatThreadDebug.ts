/** Temporary READ-SOCIAL-1 thread diagnostics — __DEV__ console only. */
export function logChatThreadDebug(phase: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log(`[chat:thread:${phase}]`, JSON.stringify(payload, null, 2));
}

/** Visible in __DEV__ so device QA can confirm bundle includes READ-SOCIAL-1 thread code. */
export const CHAT_THREAD_BUILD_MARKER = "READ-SOCIAL-1-thread-v2";
