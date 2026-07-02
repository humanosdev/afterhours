import type { ShareAspectFormat } from "./shareAspect";

export type StoryViewerStory = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  expires_at: string | null;
  is_share?: boolean;
  share_aspect?: ShareAspectFormat | null;
};

export type StoryViewerGroup = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  stories: StoryViewerStory[];
};
