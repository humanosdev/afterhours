import { Redirect, Tabs } from "expo-router";
import { AppLoadingScreen } from "../../src/components/AppLoadingScreen";
import { FloatingTabBar } from "../../src/components/FloatingTabBar";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

/**
 * Phase 2I — web-parity floating tab bar (Hub / Map / Create / Chat / Profile).
 * Visual shell only; production UX and data remain on web/PWA.
 */
export default function AppTabLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen message="Checking session…" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: {
          backgroundColor: colors.bgPrimary,
        },
      }}
    >
      <Tabs.Screen name="hub" options={{ title: "Hub" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
