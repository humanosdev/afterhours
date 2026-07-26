import { Dimensions } from "react-native";
import { hubShareMediaHeight as mediaHubShareHeight } from "./mediaLayout";

/** Hub viewport rhythm — mirrors web `/hub` spacing (structure-only pass). */
export const hubLayout = {
  searchBottomGap: 12,
  sectionHeaderMarginBottom: 6,
  momentsBlockBottom: 8,
  railPaddingY: 6,
  railPaddingBottom: 8,
  activeFriendsEmptyPy: 8,
  /** Space between Shares section title and first card header. */
  sharesFeedTop: 10,
  majorDividerMarginTop: 20,
  majorDividerMarginBottom: 10,
  sharesSectionTop: 4,
  feedTailHintMarginTop: 8,
} as const;

/** PWA `max-h-[min(52vw,280px)]` — delegates to `mediaLayout`. */
export function hubShareMediaHeight(windowWidth = Dimensions.get("window").width) {
  return mediaHubShareHeight(windowWidth);
}
