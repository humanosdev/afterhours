import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";

type SearchFieldPlaceholderProps = {
  placeholder?: string;
};

export function SearchFieldPlaceholder({
  placeholder = "Search friends, places, venues…",
}: SearchFieldPlaceholderProps) {
  return (
    <GlassSurface style={styles.wrap} muted>
      <View style={styles.inner}>
        <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.38)" />
        <Text style={styles.text}>{placeholder}</Text>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    marginBottom: layout.sectionGap,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.38)",
  },
});
