import { Crop } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import type { ShareAspectFormat } from "../../lib/shareAspect";

type ShareAspectCornerToggleProps = {
  aspectFormat: ShareAspectFormat;
  onPress: () => void;
};

/** IG-style bottom-left crop pill — toggles 4:5 ↔ 1:1 without blocking the preview. */
export function ShareAspectCornerToggle({ aspectFormat, onPress }: ShareAspectCornerToggleProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.pill}
      accessibilityRole="button"
      accessibilityLabel={aspectFormat === "portrait" ? "Switch to square crop" : "Switch to portrait crop"}
    >
      <Crop size={20} color="#fff" strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
