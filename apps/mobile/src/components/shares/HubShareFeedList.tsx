import { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { HubShareFeedCard } from "./HubShareFeedCard";
import {
  deleteHubShare,
  toggleHubShareHidden,
} from "../../lib/hubShareMutations";
import { performShareLike } from "../../lib/performShareLike";
import type { HubShareFeedCardState } from "../../lib/storyFeedInteractions";
import { patchHubShareLikeOptimistic } from "../../lib/storyFeedInteractions";
import { resolveShareStats } from "../../lib/shareStatsCache";
import type { HubShareFeedItem } from "../../types/hubFeed";
import { useCreateComposer } from "../../providers/CreateComposerProvider";
import { momentDetailRouteParams } from "../../lib/momentDetailNavigation";

type HubShareFeedListProps = {
  shares: HubShareFeedItem[];
  shareStatsById: Record<string, HubShareFeedCardState>;
  meId: string | null;
  onPatchShareStats: (
    storyId: string,
    updater: (prev: HubShareFeedCardState) => HubShareFeedCardState
  ) => void;
  onRefreshShareStats: (storyIds: string[]) => Promise<void>;
  onSharesChanged: (updater: (prev: HubShareFeedItem[]) => HubShareFeedItem[]) => void;
  onShareRemoved: (storyId: string) => void;
  onCommentsChanged: (storyId: string, delta: number) => void;
  /** Hub feed: false (inline only). Profile grid: true → `/moments/[id]`. */
  openStoryOnTap?: boolean;
};

type ShareRowProps = {
  share: HubShareFeedItem;
  stats: HubShareFeedCardState;
  meId: string | null;
  isLast: boolean;
  onToggleLike: (share: HubShareFeedItem, liked: boolean) => void;
  onOpenComments: (shareId: string) => void;
  onOpenStory?: (storyId: string) => void;
  onOpenProfile: (share: HubShareFeedItem) => void;
  openStoryOnTap?: boolean;
  onDoubleTapLike: (share: HubShareFeedItem, liked: boolean) => void;
  onToggleHideFromGrid?: (share: HubShareFeedItem) => void;
  onDeleteShare?: (shareId: string) => void;
};

const ShareRow = memo(function ShareRow({
  share,
  stats,
  meId,
  isLast,
  onToggleLike,
  onOpenComments,
  onOpenStory,
  onOpenProfile,
  openStoryOnTap = true,
  onDoubleTapLike,
  onToggleHideFromGrid,
  onDeleteShare,
}: ShareRowProps) {
  return (
    <HubShareFeedCard
      item={share}
      meId={meId}
      stats={stats}
      isLast={isLast}
      onToggleLike={() => onToggleLike(share, stats.liked)}
      onOpenComments={() => onOpenComments(share.id)}
      onOpenStory={onOpenStory ? () => onOpenStory(share.id) : undefined}
      openStoryOnTap={openStoryOnTap}
      onDoubleTapLike={() => onDoubleTapLike(share, stats.liked)}
      onOpenProfile={() => onOpenProfile(share)}
      onToggleHideFromGrid={onToggleHideFromGrid ? () => onToggleHideFromGrid(share) : undefined}
      onDeleteShare={onDeleteShare ? () => onDeleteShare(share.id) : undefined}
    />
  );
});

/** Memoized hub shares stack — stable handlers so parent hub rerenders do not bust every card. */
export function HubShareFeedList({
  shares,
  shareStatsById,
  meId,
  onPatchShareStats,
  onRefreshShareStats,
  onSharesChanged,
  onShareRemoved,
  onCommentsChanged,
  openStoryOnTap = true,
}: HubShareFeedListProps) {
  const router = useRouter();
  const { openShareComments, bumpStoryEpoch } = useCreateComposer();

  const runLike = useCallback(
    (share: HubShareFeedItem, currentlyLiked: boolean) => {
      if (!meId) return;
      void performShareLike({
        storyId: share.id,
        meId,
        ownerUserId: share.user_id,
        currentlyLiked,
        onOptimistic: (nextLiked) => {
          onPatchShareStats(share.id, (cur) => patchHubShareLikeOptimistic(cur, nextLiked));
        },
        onReconcile: () => onRefreshShareStats([share.id]),
      });
    },
    [meId, onPatchShareStats, onRefreshShareStats]
  );

  const handleToggleLike = useCallback(
    (share: HubShareFeedItem, liked: boolean) => {
      runLike(share, liked);
    },
    [runLike]
  );

  const handleOpenComments = useCallback(
    (shareId: string) => {
      openShareComments(shareId, { onCommentsChanged });
    },
    [openShareComments, onCommentsChanged]
  );

  const handleOpenStory = useCallback(
    (storyId: string) => {
      router.push(momentDetailRouteParams(storyId, "hub"));
    },
    [router]
  );

  const handleDoubleTapLike = useCallback(
    (share: HubShareFeedItem, liked: boolean) => {
      if (!meId || liked) return;
      runLike(share, false);
    },
    [meId, runLike]
  );

  const handleOpenProfile = useCallback(
    (share: HubShareFeedItem) => {
      if (share.user_id === meId) {
        router.push("/profile");
        return;
      }
      if (share.profile_slug) {
        router.push(`/u/${encodeURIComponent(share.profile_slug)}`);
        return;
      }
      router.push(`/moments/${share.id}`);
    },
    [meId, router]
  );

  const handleToggleHide = useCallback(
    (share: HubShareFeedItem) => {
      if (!meId) return;
      const next = !share.share_hidden;
      void toggleHubShareHidden(share.id, meId, next).then(({ ok }) => {
        if (!ok) return;
        if (next) {
          onShareRemoved(share.id);
        } else {
          onSharesChanged((prev) =>
            prev.map((row) => (row.id === share.id ? { ...row, share_hidden: next } : row))
          );
        }
        bumpStoryEpoch();
      });
    },
    [meId, onSharesChanged, onShareRemoved, bumpStoryEpoch]
  );

  const handleDelete = useCallback(
    (shareId: string) => {
      if (!meId) return;
      void deleteHubShare(shareId, meId).then(({ ok }) => {
        if (!ok) return;
        onShareRemoved(shareId);
        bumpStoryEpoch();
      });
    },
    [meId, onShareRemoved, bumpStoryEpoch]
  );

  return (
    <View style={styles.stack}>
      {shares.map((share, index) => {
        const stats = resolveShareStats(share.id, shareStatsById[share.id]);
        const isOwn = share.user_id === meId;
        return (
          <ShareRow
            key={share.id}
            share={share}
            stats={stats}
            meId={meId}
            onToggleLike={handleToggleLike}
            onOpenComments={handleOpenComments}
            onOpenStory={openStoryOnTap ? handleOpenStory : undefined}
            openStoryOnTap={openStoryOnTap}
            onDoubleTapLike={handleDoubleTapLike}
            onOpenProfile={handleOpenProfile}
            onToggleHideFromGrid={isOwn ? handleToggleHide : undefined}
            onDeleteShare={isOwn ? handleDelete : undefined}
            isLast={index === shares.length - 1}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
  },
});
