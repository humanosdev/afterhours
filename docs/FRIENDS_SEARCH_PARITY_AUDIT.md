# Friends & discovery search parity audit

**Date:** 2026-05-17  
**PWA sources:** `apps/web/src/app/profile/friends/page.tsx`, `apps/web/src/app/search/page.tsx`  
**Native:** `apps/mobile/app/(app)/friends.tsx`, `DiscoverySearchScreen.tsx`

---

## 1. PWA behavior audit

### Friends list (`/profile/friends`)

| Behavior | PWA | Native |
|----------|-----|--------|
| Local search | Instant filter on `display_name` + `username`; strip leading `@` | `filterFriendsLocal` — same |
| Debounce | **None** (instant) | **None** (instant) |
| Own placeholder | "Search your friends" | Same |
| Viewer placeholder | "Search their friends" | Same |
| Find new friends | Link → `/search` | → `/search-discovery` |
| Private list gate | Copy + relationship actions | Same copy; respond → `/friends` (read-only) |
| Viewer grouping | Mutual / Not in your friends | Same sections + subtitles |
| Active friends | `user_presence` realtime | **Deferred** (no presence reads) |
| Friend requests | Accept/decline/cancel writes | **Deferred** (writes) |
| Presence subtitles | `@user · {activity}` | **Deferred** — static `@user` on own list |

### Global discovery (`/search`)

| Behavior | PWA | Native |
|----------|-----|--------|
| Debounce | 240ms | 240ms (`useLocalSearchQuery(240)`) |
| Autofocus | Yes | Yes (~120ms) |
| Cancel | → `/hub` | back or `/hub` |
| People search merge | Friends matched locally first, then `searchProfilesDiscovery` | `runDiscoveryPeopleSearch` — same |
| People grouping | Friends / People subsections | Same |
| Status pills | Friend, Requested, Respond, You blocked, Blocked you, View | `DiscoveryPeopleTrailing` — read-only |
| Suggested friends | FoF graph (`loadFriendsOfFriendsSuggestions`) | `friendsOfFriends.ts` — same algorithm |
| Trending places | `user_presence` ranked | **Honest deferral** — catalog sort, note in UI |
| Recent searches | localStorage | AsyncStorage via `recentDiscoverySearches` |
| Venue search | Server `ilike` name + category | In-memory on preview list (same cap as catalog) |
| Realtime | presence sub + blocks channel | **Not ported** |

---

## 2. Data reads (documented)

| Read | Where | Notes |
|------|-------|-------|
| `friend_requests` | `fetchAcceptedFriends`, FoF, social graph | accepted / pending |
| `blocks` | `fetchAcceptedFriends`, `getBlockDirections`, FoF | |
| `profiles` | friends list, FoF, discovery RPC fallback | |
| `search_profiles_discovery` RPC | `searchProfilesDiscovery` | same as web |
| `venues` | `useVenuesPreview` | preview list only for native venue filter |

**Forbidden (not added):** `user_presence`, presence subscriptions, send friend request from search.

---

## 3. Classification

### A) Ported now
- Friends local search + mutual/other sections
- Discovery people merge (friends-first)
- Social graph pills (read-only)
- FoF suggestions
- Recent searches rail
- Block filtering on FoF + pill dimming

### B) Deferred — realtime / presence
- Active friends section
- Trending places live ranking
- `subscribeUserPresenceChanges` on search/friends
- Blocks realtime refresh (epoch bump on web)

### C) Deferred — writes
- Accept/decline/cancel friend requests on friends page
- Send request from search (View pill is navigate-only)
- Friend request actions on public profile (separate slice)

---

## 4. Remaining semantic drift

| Item | Severity |
|------|----------|
| No active friends section on native friends list | Expected until P2O-C |
| Own friends rows lack presence subtitle | Expected |
| Trending places not live-ranked | Honest label — not drift |
| Venue search in-memory vs server `ilike` | Low — bounded catalog |
| Friend request inbox on friends page | Medium — web has section; native deferred |

---

## 5. Device QA checklist

### Friends (`/friends`)
- [ ] Type in search — instant filter, `@` prefix ignored
- [ ] Empty filter vs empty list copy differs
- [ ] Find new friends → discovery
- [ ] `?view=username` mutual / other sections
- [ ] Private account gate copy

### Discovery (`/search-discovery`)
- [ ] Debounce feels like web (~¼ s)
- [ ] Friend appears under Friends before strangers
- [ ] Pills: Friend / Requested / Respond / blocked states
- [ ] FoF shows mutual count
- [ ] Trending section shows honesty note, no fake Live

---

## 6. Files

| Path | Role |
|------|------|
| `filterFriendsLocal.ts` | PWA filter semantics |
| `friendsOfFriends.ts` | FoF suggestions |
| `fetchDiscoverySocialGraph.ts` | Pending + block sets |
| `runDiscoveryPeopleSearch.ts` | Friends-first people merge |
| `DiscoveryPeopleTrailing.tsx` | Status pills |
| `friends.tsx` | Roster + local search |
| `DiscoverySearchScreen.tsx` | Global discovery |
