import { fetchAcceptedFriends } from "./fetchAcceptedFriends";
import {
  fetchFriendRequestStatus,
  fetchProfileForViewer,
  type PublicProfileRow,
} from "./fetchPublicProfile";
import { getPairBlockStatus } from "./pairBlockStatus";
import type { AcceptedFriendPublic } from "../types/friend";

export type ViewerRelationship = "none" | "incoming" | "outgoing" | "accepted";

export type FriendsListViewResult = {
  friends: AcceptedFriendPublic[];
  target: PublicProfileRow | null;
  canView: boolean;
  isOwnList: boolean;
  error: string | null;
  /** When viewing another user's list — ids that are also your friends (mutual section). */
  viewerMyFriendIds: Set<string>;
  viewerRelationship: ViewerRelationship;
};

/**
 * Own friends (`viewUsername` null) or another user's list (`?view=username`), mirroring web `/profile/friends`.
 */
export async function fetchFriendsListForViewer(
  viewerId: string,
  viewUsername: string | null | undefined
): Promise<FriendsListViewResult> {
  const view = viewUsername?.trim().toLowerCase() || null;

  const emptyViewerExtras = {
    viewerMyFriendIds: new Set<string>(),
    viewerRelationship: "none" as ViewerRelationship,
  };

  if (!view) {
    const { friends, error } = await fetchAcceptedFriends(viewerId);
    return { friends, target: null, canView: true, isOwnList: true, error, ...emptyViewerExtras };
  }

  const { profile, error: profileErr } = await fetchProfileForViewer(view);
  if (profileErr === "not_found" || !profile?.id) {
    return {
      friends: [],
      target: null,
      canView: false,
      isOwnList: false,
      error: "Could not find that profile.",
      ...emptyViewerExtras,
    };
  }
  if (profileErr) {
    return {
      friends: [],
      target: profile,
      canView: false,
      isOwnList: false,
      error: profileErr,
      ...emptyViewerExtras,
    };
  }

  if (profile.id === viewerId) {
    const { friends, error } = await fetchAcceptedFriends(viewerId);
    return {
      friends,
      target: profile,
      canView: true,
      isOwnList: true,
      error,
      ...emptyViewerExtras,
    };
  }

  const [status, pairBlock] = await Promise.all([
    fetchFriendRequestStatus(viewerId, profile.id),
    getPairBlockStatus(viewerId, profile.id),
  ]);

  const viewerRelationship: ViewerRelationship =
    status === "friends"
      ? "accepted"
      : status === "incoming"
        ? "incoming"
        : status === "outgoing"
          ? "outgoing"
          : "none";

  const accepted = viewerRelationship === "accepted";

  const canViewPrivate = !profile.is_private || accepted;

  if (!canViewPrivate || pairBlock !== "none" || profile.block_relation != null) {
    return {
      friends: [],
      target: profile,
      canView: false,
      isOwnList: false,
      error: null,
      viewerMyFriendIds: new Set(),
      viewerRelationship,
    };
  }

  const [{ friends, error }, { friends: myFriends }] = await Promise.all([
    fetchAcceptedFriends(profile.id),
    fetchAcceptedFriends(viewerId),
  ]);

  const viewerMyFriendIds = new Set(myFriends.map((f) => f.id));

  return {
    friends,
    target: profile,
    canView: true,
    isOwnList: false,
    error,
    viewerMyFriendIds,
    viewerRelationship,
  };
}
