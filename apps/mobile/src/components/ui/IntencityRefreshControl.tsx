import { Platform, RefreshControl } from "react-native";
import { colors } from "../../theme/colors";

/** Per-surface pull tint — mirrors PWA hub / chat / profile refresh chrome. */
export type PullRefreshVariant =
  | "hub"
  | "chat"
  | "profile"
  | "activity"
  | "social"
  | "search"
  | "default";

const VARIANT_TINT: Record<PullRefreshVariant, string> = {
  hub: colors.accentActive,
  chat: colors.accentMint,
  profile: "rgba(255, 255, 255, 0.88)",
  activity: colors.accentActive,
  social: colors.accent,
  search: colors.accentActive,
  default: colors.accentActive,
};

type IntencityRefreshControlProps = {
  refreshing: boolean;
  onRefresh: () => void;
  variant?: PullRefreshVariant;
};

export function IntencityRefreshControl({
  refreshing,
  onRefresh,
  variant = "default",
}: IntencityRefreshControlProps) {
  const tint = VARIANT_TINT[variant];

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tint}
      colors={Platform.OS === "android" ? [tint, colors.accent] : undefined}
      progressBackgroundColor={Platform.OS === "android" ? colors.bgSecondary : undefined}
    />
  );
}
