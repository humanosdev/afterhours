import { toggleHubShareLike } from "./hubShareMutations";
import { patchShareStatsLike } from "./shareStatsCache";
import { emitShareLikeUpdated } from "./shareLikeEvents";

type PerformShareLikeArgs = {
  storyId: string;
  meId: string;
  ownerUserId: string;
  currentlyLiked: boolean;
  onOptimistic: (nextLiked: boolean) => void;
  /** Quiet reconcile after success (liked-by line, counts). */
  onReconcile?: () => void | Promise<void>;
};

/** Optimistic like toggle — UI first, network second, rollback on failure. */
export async function performShareLike({
  storyId,
  meId,
  ownerUserId,
  currentlyLiked,
  onOptimistic,
  onReconcile,
}: PerformShareLikeArgs): Promise<boolean> {
  const nextLiked = !currentlyLiked;
  patchShareStatsLike(storyId, nextLiked);
  onOptimistic(nextLiked);
  emitShareLikeUpdated({ storyId, liked: nextLiked });

  const { ok } = await toggleHubShareLike(storyId, meId, ownerUserId, currentlyLiked);
  if (!ok) {
    patchShareStatsLike(storyId, currentlyLiked);
    onOptimistic(currentlyLiked);
    emitShareLikeUpdated({ storyId, liked: currentlyLiked });
    return false;
  }

  await onReconcile?.();
  return true;
}
