# BLOCKS-1 — unblock on blocks screen (Era 1 Mirror)

**Date:** 2026-05-26  
**PWA reference:** `/profile/blocks`

---

## Shipped

| Feature | Native |
|---------|--------|
| **Unblock** | Working button on “You blocked” rows — deletes `blocks` row |
| **Shared actions** | `blockActions.ts` (`blockUser`, `unblockUser`) used by blocks + public profile |
| **Errors** | Alert on failure; per-row loading spinner |

## Files

- `apps/mobile/src/lib/blockActions.ts`
- `apps/mobile/app/(app)/blocks.tsx`
- `apps/mobile/src/lib/fetchPublicProfile.ts` (re-exports block actions)

## QA

1. Block someone from `/u/[username]` → appears under Settings → Blocked users → You blocked
2. Tap **Unblock** → row removed; profile reachable again
3. “Blocked you” section has no unblock button (PWA parity)
