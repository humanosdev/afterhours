import { StyleSheet, View } from "react-native";
import { Skeleton, SkeletonLine } from "../ui/Skeleton";
import { ProfilePageSkeleton } from "./ProfileSkeleton";
import {
  profileTabChromeAboveIdentityPx,
  skeletonBandPageStyle,
  tabScreenHeaderChromeHeight,
} from "../../theme/skeletonLayout";
import { chrome } from "../../theme/chrome";

type ProfileTabPageSkeletonProps = {
  tabCount?: number;
  minHeight: number;
};

/** Full Profile tab — header chrome + identity shell. */
export function ProfileTabPageSkeleton({ tabCount = 3, minHeight }: ProfileTabPageSkeletonProps) {
  const identityMin = Math.max(360, minHeight - profileTabChromeAboveIdentityPx());

  return (
    <View style={[styles.page, skeletonBandPageStyle(minHeight)]}>
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <SkeletonLine width={88} height={20} />
            <SkeletonLine width={120} height={13} style={styles.subtitle} />
          </View>
          <Skeleton style={styles.menu} borderRadius={999} />
        </View>
      </View>
      <View style={styles.identityWrap}>
        <ProfilePageSkeleton tabCount={tabCount} minHeight={identityMin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
  },
  headerWrap: {
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: tabScreenHeaderChromeHeight() - 24,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  subtitle: {
    marginTop: 0,
  },
  menu: {
    width: 44,
    height: 44,
  },
  identityWrap: {
    flex: 1,
    minHeight: 0,
  },
});
