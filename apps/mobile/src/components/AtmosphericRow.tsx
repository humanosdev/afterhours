import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { chrome } from "../theme/chrome";
import { layout } from "../theme/layout";

type AtmosphericRowProps = {
  title: string;
  description?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
};

/** PWA settings/list row — `border-white/[0.08] bg-white/[0.04]`, no grey card stack. */
export function AtmosphericRow({
  title,
  description,
  onPress,
  trailing,
  destructive = false,
}: AtmosphericRowProps) {
  const body = (
    <View style={styles.inner}>
      <View style={styles.text}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={styles.shell}>{body}</View>;
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: layout.cardRadius,
    borderWidth: chrome.hairlineWidth,
    borderColor: chrome.pageHeaderBorder,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pressed: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  titleDestructive: {
    color: colors.danger,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textWhite50,
  },
});
