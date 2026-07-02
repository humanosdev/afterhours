import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { IconHitTarget } from "./IconHitTarget";
import { colors } from "../theme/colors";

type AuthBackButtonProps = {
  onPress?: () => void;
};

export function AuthBackButton({ onPress }: AuthBackButtonProps) {
  const router = useRouter();

  return (
    <IconHitTarget
      onPress={onPress ?? (() => router.back())}
      accessibilityLabel="Go back"
      size={40}
      style={styles.hit}
    >
      <Ionicons name="chevron-back" size={22} color={colors.textWhite80} />
    </IconHitTarget>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
});
