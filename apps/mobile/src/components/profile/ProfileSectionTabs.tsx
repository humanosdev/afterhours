import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { chrome } from "../../theme/chrome";
import { profileLayout } from "../../theme/profileLayout";

type ProfileSectionTabsProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabPress: (tab: T) => void;
};

/** Underline profile tabs — shared by own profile + public friend profiles. */
export function ProfileSectionTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
}: ProfileSectionTabsProps<T>) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const on = activeTab === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onTabPress(tab)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{tab}</Text>
            {on ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    gap: profileLayout.tabGap,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
    marginBottom: 0,
  },
  tab: {
    paddingBottom: profileLayout.tabPadBottom,
    position: "relative",
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textWhite42,
  },
  tabLabelOn: {
    color: colors.textPrimary,
  },
  tabIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accentActive,
  },
});
