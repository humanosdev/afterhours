import type { ProfileArchiveRow } from "./fetchProfileArchive";
import type { StoryViewerGroup, StoryViewerStory } from "./storyViewerTypes";

/** Build a single-group queue for profile expired-moment review (newest first). */
export function buildExpiredArchiveViewerGroup(args: {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  rows: ProfileArchiveRow[];
}): StoryViewerGroup | null {
  const stories: StoryViewerStory[] = args.rows
    .filter((r) => !r.is_share && r.image_url.trim())
    .map((r) => ({
      id: r.id,
      user_id: args.userId,
      media_url: r.image_url,
      created_at: r.created_at ?? new Date().toISOString(),
      expires_at: null,
      is_share: false,
    }));
  if (!stories.length) return null;
  return {
    user_id: args.userId,
    username: args.username,
    avatar_url: args.avatarUrl,
    stories,
  };
}

export function expiredArchiveStoryIndex(group: StoryViewerGroup, storyId: string): number {
  const idx = group.stories.findIndex((s) => s.id === storyId);
  return idx >= 0 ? idx : 0;
}
