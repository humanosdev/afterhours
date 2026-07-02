import { Pressable } from "react-native";
import { resolveAvatarUri } from "../lib/avatar";
import { StoryRing } from "./StoryRing";
import type { StoryRingVisualState } from "../theme/paritySemantics";
import { defaultFriendStoryRingState } from "../theme/paritySemantics";

type FriendHubRingProps = {
  avatarUrl: string | null;
  label: string;
  ringState?: StoryRingVisualState;
  onPress?: () => void;
  onPressIn?: () => void;
};

/** Hub moments rail — tap opens `StoryViewerModal` when stories exist. */
export function FriendHubRing({ avatarUrl, label, ringState, onPress, onPressIn }: FriendHubRingProps) {
  const state = ringState ?? defaultFriendStoryRingState();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} accessibilityRole="button" accessibilityLabel={label}>
      <StoryRing label={label} avatarUrl={resolveAvatarUri(avatarUrl)} ringState={state} />
    </Pressable>
  );
}
