import { Redirect } from "expo-router";

/**
 * Create is handled by the tab bar FAB (`FloatingTabBar` → `openCreateComposer`).
 * This route must never mount side effects — lazy pre-mount used to auto-open the composer.
 */
export default function CreateTabRedirect() {
  return <Redirect href="/map" />;
}
