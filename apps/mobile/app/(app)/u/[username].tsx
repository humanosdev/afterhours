import { useLocalSearchParams } from "expo-router";
import { PublicProfileScreen } from "../../../src/screens/PublicProfileScreen";

export default function PublicProfileRoute() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const handle = typeof username === "string" ? decodeURIComponent(username).trim() : "";

  if (!handle) {
    return null;
  }

  return <PublicProfileScreen username={handle} />;
}
