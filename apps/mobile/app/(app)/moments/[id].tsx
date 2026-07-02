import { useLocalSearchParams } from "expo-router";
import { MomentDetailScreen } from "../../../src/components/moments/MomentDetailScreen";
import { parseMomentDetailFrom } from "../../../src/lib/momentDetailNavigation";

/**
 * PWA `/moments/[id]` — single-story POST DETAIL (feed/archive deep link).
 * Branches on `stories.is_share` (comments/likes for shares only).
 * NOT the ephemeral StoryViewerModal — see docs/PWA_NATIVE_PARITY_AUDIT.md §21.
 */
export default function MomentDetailRoute() {
  const { id, view, from } = useLocalSearchParams<{ id?: string; view?: string; from?: string }>();
  const storyId = typeof id === "string" && id.trim() ? id.trim() : "";
  const archiveView = view === "archive";
  const returnTo = parseMomentDetailFrom(typeof from === "string" ? from : undefined);

  if (!storyId) {
    return <MomentDetailScreen storyId="" />;
  }

  return <MomentDetailScreen storyId={storyId} archiveView={archiveView} returnTo={returnTo} />;
}
