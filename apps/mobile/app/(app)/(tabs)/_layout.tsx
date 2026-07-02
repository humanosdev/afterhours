import { Tabs } from "expo-router";
import { FloatingTabBar, TAB_BAR_SCREEN_STYLE } from "../../../src/components/FloatingTabBar";
import { AppTabBootProvider } from "../../../src/providers/AppTabBootProvider";
import { MapVenueSheetProvider } from "../../../src/providers/MapVenueSheetProvider";
import { colors } from "../../../src/theme/colors";

/** Main tab shell — Hub / Map / Moments / Chat / Profile (mirrors web BottomNav). */
export default function AppTabLayout() {
  return (
    <AppTabBootProvider>
    <MapVenueSheetProvider>
    <Tabs
      initialRouteName="map"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: TAB_BAR_SCREEN_STYLE,
        sceneStyle: {
          backgroundColor: colors.bgPrimary,
          flex: 1,
        },
        lazy: false,
      }}
    >
      <Tabs.Screen name="hub" options={{ title: "Hub", lazy: false }} />
      <Tabs.Screen name="map" options={{ title: "Map", lazy: false }} />
      <Tabs.Screen name="create" options={{ title: "Moments", href: null, lazy: false }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", lazy: false }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", lazy: false }} />
    </Tabs>
    </MapVenueSheetProvider>
    </AppTabBootProvider>
  );
}
