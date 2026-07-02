import { Redirect, Stack, usePathname } from "expo-router";
import { AuthSessionRedirect } from "../../src/components/AuthSessionRedirect";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme/colors";

function isSessionRequiredRoute(pathname: string): boolean {
  return (
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    pathname === "/onboarding/username"
  );
}

function isSignedOutOnlyRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
}

export default function AuthLayout() {
  const { session } = useAuth();
  const pathname = usePathname();

  if (!session) {
    if (isSessionRequiredRoute(pathname)) {
      return <Redirect href="/login" />;
    }
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.bgPrimary },
          animation: "fade",
        }}
      />
    );
  }

  if (isSignedOutOnlyRoute(pathname)) {
    return <AuthSessionRedirect />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.bgPrimary },
        animation: "fade",
      }}
    />
  );
}
