import { Dimensions } from "react-native";
import { hubShareMediaHeight as mediaHubShareHeight } from "./mediaLayout";

/** Hub viewport rhythm — mirrors web `/hub` spacing (structure-only pass). */
export const hubLayout = {
  searchBottomGap: 12,
  sectionHeaderMarginBottom: 6,
  momentsBlockBottom: 8,
  railPaddingY: 6,
  railPaddingBottom: 8,
  sectionDivider: 6,
  activeFriendsTop: 4,
  activeFriendsEmptyPy: 8,
  /** Space between Shares section title and first card header. */
  sharesFeedTop: 10,
  majorDividerMarginTop: 20,
  majorDividerMarginBottom: 10,
  livePlacesHeaderBottom: 6,
  placesRailGap: 8,
  placesRailPaddingBottom: 8,
  sharesSectionTop: 4,
  sharesStackGap: 0,
  /** @deprecated Prefer `mediaLayout.hubShareArticle` — PWA uses pb-10 between cards, no dividers */
  shareCardSpacing: 0,
  feedTailHintMarginTop: 8,
} as const;

export function hubVenueCardWidth(windowWidth = Dimensions.get("window").width) {
  return Math.min(windowWidth * 0.68, 232);
}

/** PWA `max-h-[min(52vw,280px)]` — delegates to `mediaLayout`. */
export function hubShareMediaHeight(windowWidth = Dimensions.get("window").width) {
  return mediaHubShareHeight(windowWidth);
}

/** @deprecated Use hubShareMediaHeight */
export function hubShareMediaMaxHeight(windowWidth = Dimensions.get("window").width) {
  return hubShareMediaHeight(windowWidth);
}
