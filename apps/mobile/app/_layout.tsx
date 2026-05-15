import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { hasSupabaseConfig } from "../src/lib/env";
import { AuthProvider } from "../src/providers/AuthProvider";

export default function RootLayout() {
  if (!hasSupabaseConfig()) {
    return (
      <View style={styles.centered}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Configuration required</Text>
        <Text style={styles.body}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env (see
          .env.example).
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
  },
});
