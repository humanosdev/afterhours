import { Redirect } from "expo-router";
import { AppLoadingScreen } from "../src/components/AppLoadingScreen";
import { useAuth } from "../src/providers/AuthProvider";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen message="Checking session…" />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/login" />;
}
