import { Dimensions } from "react-native";
import { hubLayout, hubVenueCardWidth } from "./hubLayout";
import { hubShareDisplayHeight, mediaLayout } from "./mediaLayout";

const SHARE_CARD_CHROME = 96;
/** Hub `SectionHeader` title line + `sectionHeaderMarginBottom`. */
const HUB_SECTION_HEADER_H = 21 + hubLayout.sectionHeaderMarginBottom;
const ACTIVE_FRIENDS_EMPTY_MIN_H = 40;
const ACTIVE_FRIENDS_RAIL_MIN_H = 72;

/** Reserved min-heights for Hub `StableSlot` bands — prevents cold-open reflow. */
export const hubSlotLayout = {
  /** Moments rail: 78px ring + vertical padding */
  momentsRailMinHeight: 100,
  /** Active friends empty — single line of copy + padding */
  activeFriendsEmptyMinHeight: ACTIVE_FRIENDS_EMPTY_MIN_H,
  /** Active friends chip rail — 52px avatar + labels */
  activeFriendsRailMinHeight: ACTIVE_FRIENDS_RAIL_MIN_H,
  /** Live places horizontal card (5:6 at card width) */
  livePlacesMinHeight: Math.ceil(hubVenueCardWidth() / (5 / 6)) + 8,
  /** One share skeleton card — 4:5 media + header/actions rhythm */
  shareCardMinHeight: hubShareDisplayHeight() + SHARE_CARD_CHROME + mediaLayout.hubShareArticle.paddingBottom,
  /** Two share skeletons + spacing */
  sharesLoadingMinHeight:
    (hubShareDisplayHeight() + SHARE_CARD_CHROME + mediaLayout.hubShareArticle.paddingBottom) * 2 + 12,
  /** Active friends section — header + empty copy. */
  activeFriendsBlockEmptyMinHeight:
    HUB_SECTION_HEADER_H +
    hubLayout.railPaddingY +
    ACTIVE_FRIENDS_EMPTY_MIN_H +
    hubLayout.railPaddingBottom +
    4,
  /** Active friends section — header + chip rail. */
  activeFriendsBlockWithRailMinHeight:
    HUB_SECTION_HEADER_H +
    hubLayout.railPaddingY +
    ACTIVE_FRIENDS_RAIL_MIN_H +
    hubLayout.railPaddingBottom +
    4,
} as const;

/** Reserved height for hub feed `StableSlot` — mirrors `HubFeedPageSkeleton` geometry. */
export function hubFeedPageMinHeight(showActiveFriends: boolean): number {
  const momentsRail =
    hubLayout.railPaddingY +
    hubLayout.railPaddingBottom +
    hubSlotLayout.momentsRailMinHeight;
  const momentsBlock = HUB_SECTION_HEADER_H + momentsRail + hubLayout.momentsBlockBottom;

  const dividerBlock =
    1 + hubLayout.majorDividerMarginTop + hubLayout.majorDividerMarginBottom;

  const activeFriendsBlock = showActiveFriends
    ? dividerBlock + hubSlotLayout.activeFriendsBlockWithRailMinHeight
    : 0;

  const sharesBlock =
    hubLayout.sharesSectionTop +
    HUB_SECTION_HEADER_H +
    hubLayout.sharesFeedTop +
    hubSlotLayout.sharesLoadingMinHeight;

  return momentsBlock + activeFriendsBlock + dividerBlock + sharesBlock;
}

export function hubShareBleedWidth(windowWidth = Dimensions.get("window").width): number {
  return windowWidth;
}
