import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { Surface } from "../Surface";
import { colors } from "../../theme/colors";
import { hubLayout } from "../../theme/hubLayout";
import { layout } from "../../theme/layout";

/** Hub search affordance — opens discovery overlay. */
export function HubSearchLauncher() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/search-discovery")}
      accessibilityRole="button"
      accessibilityLabel="Open search and discovery"
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Surface variant="field" style={styles.field}>
        <View style={styles.inner}>
          <Search size={18} color={colors.textWhite42} strokeWidth={2} />
          <Text style={styles.placeholder}>Search friends, people, venues...</Text>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginBottom: hubLayout.searchBottomGap,
  },
  pressed: {
    opacity: 0.94,
  },
  field: {
    borderRadius: layout.pillRadius,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: layout.searchBarHeight,
    paddingHorizontal: 16,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textWhite42,
  },
});
