/** PWA `StoryCameraModal` LOOK_FILTERS — labels for capture preview rail. */
export const STORY_LOOK_FILTERS = [
  { id: "none", label: "Normal" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "vivid", label: "Vivid" },
  { id: "mono", label: "B&W" },
  { id: "fade", label: "Soft" },
] as const;

export type StoryLookFilterId = (typeof STORY_LOOK_FILTERS)[number]["id"];
