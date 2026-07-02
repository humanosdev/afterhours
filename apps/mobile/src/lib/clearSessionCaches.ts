import { clearPostAuthHrefCache } from "./authRouting";
import { resetMapBootGate } from "./mapBootGate";
import { clearFittedShellRevealCache, resetAppSessionBootShell } from "../hooks/useMinimumSkeleton";
import { resetTabBootSession } from "../providers/AppTabBootProvider";
import { resetAppOpenSessionState } from "./appOpenPreference";
import { clearCachedAcceptedFriends } from "./acceptedFriendsCache";
import { clearCachedChatPreviews } from "./chatPreviewsCache";
import { clearCachedHubMoments } from "./hubMomentsCache";
import { clearCachedViewedStoryIds } from "./storyViewedCache";
import { clearCachedMyProfile } from "./myProfileCache";
import { clearCachedPresencePreview } from "./presencePreviewCache";
import { clearCachedProfileArchive } from "./profileArchiveCache";
import { clearCachedProfileShares } from "./profileSharesCache";
import { clearCachedMapLastLocation } from "./mapLastLocationCache";
import { clearCachedVenuesPreview } from "./venuesPreviewCache";

/** Wipe in-memory tab caches on sign-out so the next user never sees stale data. */
export function clearSessionCaches(): void {
  clearFittedShellRevealCache();
  resetAppSessionBootShell();
  resetTabBootSession();
  resetAppOpenSessionState();
  clearPostAuthHrefCache();
  resetMapBootGate();
  clearCachedMyProfile();
  clearCachedAcceptedFriends();
  clearCachedChatPreviews();
  clearCachedProfileShares();
  clearCachedProfileArchive();
  clearCachedVenuesPreview();
  clearCachedMapLastLocation();
  clearCachedPresencePreview();
  clearCachedHubMoments();
  clearCachedViewedStoryIds();
}
