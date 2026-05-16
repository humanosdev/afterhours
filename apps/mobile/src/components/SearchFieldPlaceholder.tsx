import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type SearchFieldPlaceholderProps = {
  placeholder?: string;
  /** When set with `onChangeText`, renders a glass `TextInput` (Phase 2O integrated search). */
  value?: string;
  onChangeText?: (text: string) => void;
};

export function SearchFieldPlaceholder({
  placeholder = "Search friends, places, venues…",
  value,
  onChangeText,
}: SearchFieldPlaceholderProps) {
  const interactive = typeof onChangeText === "function";

  return (
    <GlassSurface style={styles.wrap}>
      <View style={styles.inner}>
        <Ionicons name="search-outline" size={18} color={colors.textWhite42} />
        {interactive ? (
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textWhite42}
            value={value ?? ""}
            onChangeText={onChangeText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel={placeholder}
          />
        ) : (
          <Text style={styles.text}>{placeholder}</Text>
        )}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    marginBottom: layout.sectionGap,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    minHeight: 50,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: colors.textWhite42,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
});
