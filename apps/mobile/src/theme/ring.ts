/** Story ring tokens — mirrors web `Avatar` storyRing + `StoryRing` gradients. */
export const ringTokens = {
  outerPadStoryLg: 4,
  gutter: 1.5,
  photoBorder: 2.5,
  activeGradient: ["rgba(59, 102, 255, 0.72)", "rgba(255, 255, 255, 0.22)"] as const,
  mutedGradient: ["rgba(255, 255, 255, 0.16)", "rgba(255, 255, 255, 0.07)"] as const,
  avatarFallback: ["#5B82FF", "#3B66FF", "#4774FF"] as const,
  activeGlow: {
    shadowColor: "#3b66ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  mutedGlow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
