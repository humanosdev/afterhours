import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { colors } from "../theme/colors";
import { HubBootLogo } from "./HubBootLogo";

type AppLoadingScreenProps = {
  onLayout?: (event: LayoutChangeEvent) => void;
};

/** Minimal boot splash — centered hub logo on app navy. */
export function AppLoadingScreen({ onLayout }: AppLoadingScreenProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    void SplashScreen.hideAsync();
    onLayout?.(event);
  };

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <HubBootLogo />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
