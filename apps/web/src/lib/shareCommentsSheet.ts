export const OPEN_SHARE_COMMENTS_EVENT = "ah-open-share-comments";

export type OpenShareCommentsDetail = { storyId: string };

export function openShareCommentsSheet(storyId: string) {
  if (typeof window === "undefined" || !storyId) return;
  window.dispatchEvent(
    new CustomEvent<OpenShareCommentsDetail>(OPEN_SHARE_COMMENTS_EVENT, { detail: { storyId } })
  );
}
