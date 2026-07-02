# Chat thread parity audit — READ-SOCIAL-1

**Date:** 2026-05-17  
**PWA source of truth:** `apps/web/src/app/chat/[id]/page.tsx` (`ChatConversationPage`)  
**Native implementation:** `apps/mobile/app/(app)/chat/[id].tsx`, `ChatThreadShell`, `fetchChatThread.ts`, `useChatThread`

---

## 1. PWA thread behavior audit

### Ordering & grouping
| Behavior | PWA | Native (READ-SOCIAL-1) |
|----------|-----|------------------------|
| Message order | `created_at` ascending | Same query |
| Sender grouping | **None** — one bubble per row | Matched |
| Date separators | None | None |

### Timestamps
| Behavior | PWA | Native |
|----------|-----|--------|
| Default visibility | Hidden | Hidden |
| Reveal | Tap bubble toggles timestamp | Tap bubble toggles timestamp |
| Format | `toLocaleString` short month/day + time | `formatMessageTimestamp` — same options |

### Empty / loading / error
| State | PWA | Native |
|-------|-----|--------|
| Loading | `ChatConversationSkeleton` until `threadGateReady` | `ChatConversationSkeleton` until gate |
| Invalid chat / not participant | Redirect `/chat` | `router.replace("/chat")` |
| Empty transcript | Blank scroll (no copy) | Blank scroll |
| Message fetch error | Silent (empty list) | Error banner above transcript |

### Blocked handling
| State | PWA | Native |
|-------|-----|--------|
| History when blocked | Still visible | Still visible |
| Composer | Block banner replaces input | Same copy, same layout |

### Participant hydration
| Step | Table / helper | Columns |
|------|----------------|---------|
| Membership | `chats` | `id, user1_id, user2_id` |
| Peer profile | `profiles` | `id, username, display_name, avatar_url` |
| Block edge | `blocks` via `getPairBlockStatus` | `blocker_id, blocked_id` |
| Messages | `messages` | `id, sender_id, receiver_id, content, created_at` |

No SQL joins — same as PWA.

### Scroll / keyboard / safe area
| Concern | PWA | Native |
|---------|-----|--------|
| Auto-scroll on history | `scrollIntoView` end | `ScrollView.scrollToEnd` on content change |
| Keyboard | `visualViewport` inset on composer | `KeyboardAvoidingView` (read-only; composer disabled) |
| Safe area top | `env(safe-area-inset-top)+8` | `useSafeAreaInsets` + 8 |
| Safe area bottom | `env(safe-area-inset-bottom)` on composer | `insets.bottom` on composer |
| Max width | `28rem` / `32rem` column | `layout.contentMaxWidth` center column |

### Avatar / name / bubbles
| Rule | PWA | Native |
|------|-----|--------|
| Header title | `display_name \|\| username \|\| "Chat"` | `peerDisplayTitle()` |
| Handle | `@username` when present | Same |
| Transcript avatars | None | None |
| Own bubble | `sky-500/85`, `rounded-br-md`, max 78% | `rgba(14,165,233,0.85)`, same radii |
| Peer bubble | `white/10`, `rounded-bl-md` | `rgba(255,255,255,0.1)` |
| Row spacing | `mb-2.5` (~10px) | `marginBottom: 10` |

### Header navigation
| PWA | Native |
|-----|--------|
| `/profile/${id}` | `/u/${username}` when username exists (native public profile route) |

---

## 2. Classification

### A) Ported now (read-only)
- Membership gate + redirect
- Peer profile + block banner (read `blocks`)
- Message history one-shot fetch
- Bubble layout, tap-to-reveal timestamps
- Thread skeleton
- Safe-area header/composer
- Disabled composer + honest send deferral note
- Block copy (exact PWA strings)

### B) Deferred — realtime (REALTIME-1)
- `supabase.channel('chat:{id}')` INSERT handler
- Optimistic send reconciliation
- Inbox list live updates (`chat-list:{meId}`)
- `chat-seen-updated` custom event
- Notification toast on new message

### C) Deferred — write authority
- `send()` INSERT `messages`
- UPDATE `chats.last_message`
- `createNotification`
- Bulk / per-message `seen` updates
- Mark message notifications read
- “Delete for me” (`localStorage` on PWA — optional native port with SecureStore later)
- New DM / inbox hide / delete chats

---

## 3. Data discipline — reads added

| Read | File | Reuse |
|------|------|-------|
| `chats` membership | `fetchChatThread.ts` | Same table/columns as list dedup logic in `fetchChatPreviews.ts` |
| `profiles` peer | `fetchChatThread.ts` | Same `PROFILE_COLUMNS` shape as previews |
| `blocks` | `pairBlockStatus.ts` | Already used on public profile |
| `messages` thread | `fetchChatThread.ts` | Same columns as preview latest message fetch (without `seen` in thread transcript) |

**No new tables.** No `user_presence`. No subscriptions.

---

## 4. Remaining semantic drift

| Item | Severity | Notes |
|------|----------|-------|
| Send UI visible but disabled | Low | PWA shows live input; native shows PWA-shaped disabled row + deferral note (honest) |
| Delete for me | Low | Not ported — read-only phase |
| Profile deep link | Low | PWA uses user id; native requires `username` for `/u/…` |
| Message load error banner | Low | Native is **more honest** than PWA silent failure |
| List peer cache | None | Thread no longer depends on `useChatPreviews` for transcript (still used on list tab only) |
| `seen` / unread | Medium | Deferred REALTIME-1 — list still shows unread dot from preview fetch |

---

## 5. Device QA checklist (vs PWA)

- [ ] Open thread from list — header name/avatar/@handle match PWA for same peer
- [ ] Message order matches PWA for same `chat_id`
- [ ] Own vs peer bubble alignment and colors
- [ ] Tap bubble — timestamp appears/disappears (no delete menu on native)
- [ ] Empty thread — blank area, not placeholder card
- [ ] Blocked pair — history visible, block banner, no send
- [ ] Invalid `chat_id` — returns to chat list
- [ ] Scroll opens at bottom on load
- [ ] Back returns to list

---

## 6. Device QA incident (2026-05-17) — placeholder still visible

### Symptom
Thread showed legacy copy:
- “No messages loaded yet”
- “Conversation layout matches Intencity…”
- Composer with **arrow-up** icon (not “Send” label)

### Root cause (codebase audit)
Those strings and UI **do not exist** in current `main` workspace source (`rg` finds zero matches). The screenshot matches **pre–READ-SOCIAL-1** `ChatThreadShell.tsx`, not the shipped implementation.

**Primary diagnosis: stale Metro / dev-client bundle** (JS not reloaded after READ-SOCIAL-1 land).

**Secondary checks if bundle is fresh:**
| Check | Log tag |
|-------|---------|
| Route `chat_id` | `[chat:thread:route_params]` |
| Membership | `[chat:thread:membership_result]` |
| Peer profile | `[chat:thread:peer_profile_result]` |
| Messages count | `[chat:thread:messages_result]` |
| Build marker on screen | `READ-SOCIAL-1-thread-v2 · N msgs` (__DEV__ only) |

If marker is **missing** → old bundle.  
If marker shows **`0 msgs`** but list preview has text → possible RLS empty read or wrong `chat_id` (see logs).

### Peer title `user_*`
If `peer_profile_result.username` is `user_1ca4e32c`, that is **real profile data** (auto username), not a hydration fallback. PWA uses `display_name || username || "Chat"`.

### Fixes applied after incident
1. `threadHydrated` — skeleton until **messages fetch completes** (not gate-only).
2. Structured `[chat:thread:*]` dev logs.
3. `CHAT_THREAD_BUILD_MARKER` on thread in __DEV__.
4. Explicit `Stack.Screen name="chat/[id]"` in `(app)/_layout.tsx`.

### Reload steps (device)
```bash
cd apps/mobile && npx expo start --clear
```
If using dev client: rebuild or reinstall after native dep changes. Confirm dev marker appears on thread.

---

## 7. Files

| Path | Role |
|------|------|
| `apps/mobile/src/lib/fetchChatThread.ts` | Documented read-only queries |
| `apps/mobile/src/hooks/useChatThread.ts` | Gate + message load orchestration |
| `apps/mobile/src/lib/formatMessageTimestamp.ts` | PWA timestamp formatter |
| `apps/mobile/src/types/chatThread.ts` | Thread types |
| `apps/mobile/src/components/chat/ChatThreadShell.tsx` | Transcript UI |
| `apps/mobile/src/components/skeletons/ChatConversationSkeleton.tsx` | Loading chrome |
| `apps/mobile/app/(app)/chat/[id].tsx` | Route wiring |
