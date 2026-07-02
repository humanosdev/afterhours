import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHitTarget } from "./IconHitTarget";
import { colors } from "../theme/colors";
import { chrome } from "../theme/chrome";

type StackScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** PWA friends header: centered title, optional right slot */
  variant?: "default" | "centered";
  rightSlot?: ReactNode;
  onBack?: () => void;
};

export function StackScreenHeader({
  title,
  subtitle,
  variant = "default",
  rightSlot,
  onBack,
}: StackScreenHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());

  if (variant === "centered") {
    return (
      <View style={styles.centeredWrap}>
        <View style={styles.centeredRow}>
          <IconHitTarget onPress={goBack} accessibilityLabel="Go back" size={40}>
            <Text style={styles.backChevron}>←</Text>
          </IconHitTarget>
          <Text style={styles.centeredTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.rightSlot}>{rightSlot ?? <View style={styles.backSpacer} />}</View>
        </View>
        {subtitle ? <Text style={styles.centeredSubtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <IconHitTarget onPress={goBack} accessibilityLabel="Go back" size={40}>
        <Text style={styles.backChevron}>←</Text>
      </IconHitTarget>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : <View style={styles.backSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
    gap: 10,
    minHeight: 44,
  },
  centeredWrap: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: chrome.hairlineWidth,
    borderBottomColor: chrome.pageHeaderBorder,
    gap: 8,
  },
  centeredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  backChevron: {
    fontSize: 17,
    color: colors.textWhite78,
    marginTop: -1,
  },
  backSpacer: {
    width: 40,
    height: 40,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.35,
    color: colors.textPrimary,
  },
  centeredTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
  },
  centeredSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite42,
    textAlign: "center",
  },
  rightSlot: {
    minWidth: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
