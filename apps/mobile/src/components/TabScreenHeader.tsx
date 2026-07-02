import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { chrome } from "../theme/chrome";

type TabScreenHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
};

/** Hub / Messages / Profile tab titles — shared divider + typography. */
export function TabScreenHeader({ title, subtitle, centerSlot, rightSlot }: TabScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, centerSlot != null && styles.rowWithCenter]}>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle != null ? (
            typeof subtitle === "string" ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : (
              subtitle
            )
          ) : null}
        </View>
        {centerSlot != null ? (
          <View style={styles.center} pointerEvents="box-none">
            {centerSlot}
          </View>
        ) : null}
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  rowWithCenter: {
    position: "relative",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: "center",
    zIndex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.35,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
  },
  right: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    minHeight: 44,
    zIndex: 1,
  },
});
