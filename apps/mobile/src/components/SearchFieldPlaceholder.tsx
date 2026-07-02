import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "./Surface";
import { GlassSearchField } from "./ui/GlassSearchField";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type SearchFieldPlaceholderProps = {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  variant?: "pill" | "field";
};

export function SearchFieldPlaceholder({
  placeholder = "Search friends, venues…",
  value,
  onChangeText,
  onPress,
  variant = "pill",
}: SearchFieldPlaceholderProps) {
  const interactive = typeof onChangeText === "function";
  const isPill = variant === "pill";

  const inner = interactive ? (
    <GlassSearchField
      value={value ?? ""}
      onChangeText={onChangeText}
      placeholder={placeholder}
      leading={<Ionicons name="search-outline" size={18} color={colors.textWhite42} />}
    />
  ) : (
    <View style={[styles.inner, isPill ? styles.innerPill : styles.innerField]}>
      <Ionicons name="search-outline" size={18} color={colors.textWhite42} />
      <Text style={styles.text}>{placeholder}</Text>
    </View>
  );

  const field = (
    <Surface
      variant="field"
      style={[styles.wrap, isPill ? styles.wrapPill : styles.wrapField]}
    >
      {inner}
    </Surface>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.pressable}>
        {field}
      </Pressable>
    );
  }

  return field;
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: layout.sectionGap,
  },
  wrap: {
    marginBottom: layout.sectionGap,
  },
  wrapPill: {
    borderRadius: layout.pillRadius,
  },
  wrapField: {
    borderRadius: layout.inputRadius,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: layout.searchBarHeight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  innerPill: {},
  innerField: {
    minHeight: 44,
    paddingHorizontal: 12,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: colors.textWhite42,
  },
});
