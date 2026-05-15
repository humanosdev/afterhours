import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { IntencityWordmark } from "./IntencityWordmark";
import { Screen } from "./Screen";

type AppLoadingScreenProps = {
  message?: string;
};

export function AppLoadingScreen({ message = "Loading…" }: AppLoadingScreenProps) {
  return (
    <Screen centered>
      <View style={styles.stack}>
        <IntencityWordmark size="large" />
        <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: "center",
    gap: 20,
  },
  spinner: {
    marginTop: 8,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
