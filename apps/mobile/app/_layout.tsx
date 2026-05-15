import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Screen } from "../src/components/Screen";
import { hasSupabaseConfig } from "../src/lib/env";
import { AuthProvider } from "../src/providers/AuthProvider";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  if (!hasSupabaseConfig()) {
    return (
      <SafeAreaProvider>
        <Screen centered>
          <StatusBar style="light" />
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Configuration required</Text>
            <Text style={styles.configBody}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env (see
              .env.example).
            </Text>
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
            animation: "fade",
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configCard: {
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 10,
  },
  configTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  configBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
