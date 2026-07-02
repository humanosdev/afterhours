/**
 * Canonical Intencity media product language (web + native).
 * - **moment** — ephemeral ring (`stories.is_share = false`)
 * - **share** — hub feed post (`stories.is_share = true`)
 */
export type StoryContentKind = "moment" | "share";

export const mediaLexicon = {
  moment: {
    label: "Moment",
    labelPlural: "Moments",
    add: "Add moment",
    new: "New moment",
    your: "Your moment",
    delete: "Delete moment",
  },
  share: {
    label: "Share",
    labelPlural: "Shares",
    add: "Add share",
    new: "New share",
    your: "Your share",
    delete: "Delete share",
    hideFromGrid: "Hide from grid",
    unhideFromGrid: "Unhide from grid",
    options: "Share options",
    view: "View share",
  },
  publish: {
    post: "Post",
    publishing: "Publishing…",
    signIn: "Sign in to publish.",
    failed: "Couldn't publish. Check your connection and try again.",
    permissionPhotos: "Photo library access is required to publish. You can enable it in Settings.",
  },
  hub: {
    sectionTitle: "Shares",
    emptyTitle: "Be the first to add a share",
    emptyBody: "When friends publish shares, they show up in this feed.",
    previewSubtitle: "Preview · hub feed",
  },
  unavailable: {
    title: "This share isn't available",
    body: "It may be private, removed, or you don't have access.",
  },
} as const;

/** Map DB `stories.is_share` → product kind (single code path). */
export function storyContentKind(isShare: boolean | null | undefined): StoryContentKind {
  return isShare === true ? "share" : "moment";
}

export function storyKindLabel(kind: StoryContentKind, opts?: { plural?: boolean }): string {
  const block = mediaLexicon[kind];
  return opts?.plural ? block.labelPlural : block.label;
}

export function storyKindLabelFromRow(isShare: boolean | null | undefined, opts?: { plural?: boolean }): string {
  return storyKindLabel(storyContentKind(isShare), opts);
}
