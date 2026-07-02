import type { ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { CrossfadeBand } from "./CrossfadeBand";

type AsyncSectionProps = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  /** @deprecated No longer animates — kept so call sites stay stable. */
  contentKey?: string | number;
  style?: StyleProp<ViewStyle>;
  minDisplayMs?: number;
  variant?: "fitted" | "section" | "micro";
};

/** Standard async section — crossfade skeleton → content (PWA Core Feel). */
export function AsyncSection({
  loading,
  skeleton,
  children,
  style,
  minDisplayMs,
  variant = "section",
}: AsyncSectionProps) {
  return (
    <CrossfadeBand loading={loading} skeleton={skeleton} style={style} minDisplayMs={minDisplayMs} variant={variant}>
      {children}
    </CrossfadeBand>
  );
}
