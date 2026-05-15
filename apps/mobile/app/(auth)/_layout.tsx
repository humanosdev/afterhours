import { Redirect, Stack } from "expo-router";
import { AppLoadingScreen } from "../../src/components/AppLoadingScreen";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen message="Checking session…" />;
  }

  if (session) {
    return <Redirect href="/hub" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: "fade",
      }}
    />
  );
}
