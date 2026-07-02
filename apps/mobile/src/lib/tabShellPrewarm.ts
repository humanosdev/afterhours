import { getCachedAcceptedFriends, setCachedAcceptedFriends } from "./acceptedFriendsCache";
import { getCachedChatPreviews, setCachedChatPreviews } from "./chatPreviewsCache";
import { fetchAcceptedFriends } from "./fetchAcceptedFriends";
import { fetchActiveMomentsByUserIds } from "./fetchActiveMoments";
import { fetchChatPreviews } from "./fetchChatPreviews";
import { fetchHubFeedPreview } from "./fetchHubFeedPreview";
import { fetchMyProfile } from "./fetchMyProfile";
import { fetchUserPresenceRows } from "./fetchUserPresence";
import { fetchVenuesPreview } from "./fetchVenuesPreview";
import {
  getCachedPresencePreview,
  setCachedPresencePreview,
} from "./presencePreviewCache";
import {
  getCachedHubFeedPreview,
  setCachedHubFeedPreview,
} from "./hubFeedPreviewCache";
import { getCachedHubMoments, hubMomentsCacheKey, setCachedHubMoments } from "./hubMomentsCache";
import { getCachedMyProfile, setCachedMyProfile } from "./myProfileCache";
import { getCachedVenuesPreview, setCachedVenuesPreview } from "./venuesPreviewCache";

let prewarmPromise: Promise<void> | null = null;
let prewarmUserId: string | null = null;

/** True when every tab shell cache slot is populated for this user. */
export function isTabShellCacheWarm(userId: string): boolean {
  return (
    getCachedAcceptedFriends(userId) != null &&
    getCachedVenuesPreview() != null &&
    getCachedChatPreviews(userId) != null &&
    getCachedMyProfile(userId) != null
  );
}

/** Warm tab caches once per session so first tab switches skip skeleton flashes. */
export function prewarmTabShellData(userId: string, storyEpoch = 0): Promise<void> {
  if (prewarmUserId === userId && prewarmPromise) return prewarmPromise;

  prewarmUserId = userId;
  prewarmPromise = (async () => {
    const tasks: Promise<void>[] = [];

    if (!getCachedAcceptedFriends(userId)) {
      tasks.push(
        fetchAcceptedFriends(userId).then(({ friends }) => {
          setCachedAcceptedFriends(userId, friends);
        })
      );
    }

    if (!getCachedVenuesPreview()) {
      tasks.push(
        fetchVenuesPreview().then(({ venues }) => {
          setCachedVenuesPreview(venues);
        })
      );
    }

    if (!getCachedPresencePreview()) {
      tasks.push(
        fetchUserPresenceRows().then(({ presence, error }) => {
          if (!error) setCachedPresencePreview(presence);
        })
      );
    }

    if (!getCachedChatPreviews(userId)) {
      tasks.push(
        fetchChatPreviews(userId).then(({ previews }) => {
          setCachedChatPreviews(userId, previews);
        })
      );
    }

    if (!getCachedMyProfile(userId)) {
      tasks.push(
        fetchMyProfile(userId).then(({ profile }) => {
          if (profile) setCachedMyProfile(userId, profile, { silent: true });
        })
      );
    }

    await Promise.all(tasks);

    const friends = getCachedAcceptedFriends(userId) ?? [];
    const friendIds = friends.map((f) => f.id);
    const friendKey = friendIds.slice().sort().join(",");
    const momentsKey = hubMomentsCacheKey(userId, friendIds, storyEpoch);

    await Promise.all([
      getCachedHubFeedPreview(userId, friendKey)
        ? Promise.resolve()
        : fetchHubFeedPreview(userId, friendIds)
            .then(({ shares }) => {
              setCachedHubFeedPreview(userId, friendKey, shares);
            })
            .catch(() => undefined),
      getCachedHubMoments(momentsKey)
        ? Promise.resolve()
        : fetchActiveMomentsByUserIds([userId, ...friendIds]).then((map) => {
            setCachedHubMoments(momentsKey, map);
          }),
    ]);
  })();

  return prewarmPromise;
}
