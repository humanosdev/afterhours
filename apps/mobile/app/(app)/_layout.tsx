import { Redirect, Stack } from "expo-router";
import { ChatSendQueueProcessor } from "../../src/components/ChatSendQueueProcessor";
import { AppOpenTracker } from "../../src/components/AppOpenTracker";
import { ProfileOnboardingGate } from "../../src/components/ProfileOnboardingRedirect";
import { ProfilePlaceEarnTracker } from "../../src/components/ProfilePlaceEarnTracker";
import { NativePresenceWriteTracker } from "../../src/components/NativePresenceWriteTracker";
import { TabShellPrewarm } from "../../src/components/TabShellPrewarm";
import { useAuth } from "../../src/providers/AuthProvider";
import { AppLifecycleProvider } from "../../src/providers/AppLifecycleProvider";
import { CreateComposerProvider } from "../../src/providers/CreateComposerProvider";
import { NotificationDeliveryProvider } from "../../src/providers/NotificationDeliveryProvider";
import { PresenceProvider } from "../../src/providers/PresenceProvider";
import { PushNotificationProvider } from "../../src/providers/PushNotificationProvider";
import { ReportedContentProvider } from "../../src/providers/ReportedContentProvider";
import { colors } from "../../src/theme/colors";

/**
 * Signed-in stack over tabs — stack routes mirror web IA.
 */
export default function AppStackLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <ReportedContentProvider>
    <CreateComposerProvider>
      <AppLifecycleProvider>
      <NotificationDeliveryProvider>
        <PushNotificationProvider>
        <PresenceProvider>
        <ProfileOnboardingGate>
        <NativePresenceWriteTracker />
        <ProfilePlaceEarnTracker />
        <AppOpenTracker />
        <ChatSendQueueProcessor />
        <TabShellPrewarm />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" options={{ animation: "slide_from_right" }} />
        </Stack>
        </ProfileOnboardingGate>
        </PresenceProvider>
        </PushNotificationProvider>
      </NotificationDeliveryProvider>
      </AppLifecycleProvider>
    </CreateComposerProvider>
    </ReportedContentProvider>
  );
}
