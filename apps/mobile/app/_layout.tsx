import "react-native-gesture-handler";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BootLoadingOverlay } from "../src/components/BootLoadingOverlay";
import { AppLoadingScreen } from "../src/components/AppLoadingScreen";
import { Screen } from "../src/components/Screen";
import { hasSupabaseConfig, getSupabaseUrlMisconfigHint } from "../src/lib/env";
import { checkSupabaseReachability } from "../src/lib/checkSupabaseReachability";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { AppShellVisibleProvider } from "../src/providers/AppShellVisibleProvider";
import { colors } from "../src/theme/colors";
import { motion } from "../src/theme/motion";

void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { loading } = useAuth();
  const bootStartedAtRef = useRef(Date.now());
  const [bootHoldDone, setBootHoldDone] = useState(false);

  useEffect(() => {
    const delay = Math.max(0, motion.boot.loadingScreenMinMs - (Date.now() - bootStartedAtRef.current));
    const timer = setTimeout(() => setBootHoldDone(true), delay);
    return () => clearTimeout(timer);
  }, []);

  const showBootScreen = loading || !bootHoldDone;

  useEffect(() => {
    if (!showBootScreen) {
      void SplashScreen.hideAsync();
    }
  }, [showBootScreen]);

  return (
    <AppShellVisibleProvider visible={!showBootScreen}>
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgPrimary },
          animation: "fade",
        }}
      />
      <BootLoadingOverlay visible={showBootScreen} />
    </View>
    </AppShellVisibleProvider>
  );
}

export default function RootLayout() {
  const supabaseUrlHint = getSupabaseUrlMisconfigHint(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const [reachability, setReachability] = useState<"checking" | "ok" | "failed">(
    () => (hasSupabaseConfig() && !supabaseUrlHint ? "checking" : "ok")
  );
  const [reachabilityMessage, setReachabilityMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig() || supabaseUrlHint) return;
    let cancelled = false;
    const forceProceed = setTimeout(() => {
      if (cancelled) return;
      setReachability((current) => {
        if (current !== "checking") return current;
        if (__DEV__) {
          console.warn("[boot] Supabase reachability timed out — continuing");
        }
        return "ok";
      });
    }, 10_000);

    void checkSupabaseReachability().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setReachability("ok");
        setReachabilityMessage(null);
        return;
      }
      setReachability("failed");
      setReachabilityMessage(result.message);
    });
    return () => {
      cancelled = true;
      clearTimeout(forceProceed);
    };
  }, [supabaseUrlHint]);

  if (!hasSupabaseConfig()) {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
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
      </GestureHandlerRootView>
    );
  }

  if (supabaseUrlHint) {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaProvider>
          <Screen centered>
            <StatusBar style="light" />
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Supabase URL misconfigured</Text>
              <Text style={styles.configBody}>{supabaseUrlHint}</Text>
            </View>
          </Screen>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (reachability === "checking") {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaProvider>
          <AppLoadingScreen />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (reachability === "failed") {
    return (
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaProvider>
          <Screen centered>
            <StatusBar style="light" />
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Can&apos;t reach Supabase</Text>
              <Text style={styles.configBody}>
                {reachabilityMessage ??
                  "Network request failed. Open Supabase dashboard → Project Settings → API and copy the Project URL into apps/mobile/.env as EXPO_PUBLIC_SUPABASE_URL, then rebuild the dev client."}
              </Text>
              <Text style={styles.configHint}>
                Your current URL host must resolve (e.g. https://YOUR_REF.supabase.co). A deleted or
                paused project will fail with this error.
              </Text>
            </View>
          </Screen>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gestureRoot: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
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
  configHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
