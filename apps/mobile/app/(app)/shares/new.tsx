import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateComposer } from "../../../src/providers/CreateComposerProvider";
import { colors } from "../../../src/theme/colors";

/** Deep link — opens global create composer (shares mode), mirrors PWA shell flow. */
export default function SharesNewRoute() {
  const router = useRouter();
  const { openCreateComposer } = useCreateComposer();

  useEffect(() => {
    openCreateComposer({ mode: "shares_only", tab: "shares" });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/map");
    }
  }, [openCreateComposer, router]);

  return <View style={styles.shell} />;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
});
