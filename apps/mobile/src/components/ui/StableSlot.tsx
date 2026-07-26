import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { CrossfadeBand } from "./CrossfadeBand";

type StableSlotProps = {
  style?: StyleProp<ViewStyle>;
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  /** @deprecated No longer animates — kept so call sites stay stable. */
  contentKey?: string | number;
  minDisplayMs?: number;
  variant?: "fitted" | "section" | "micro";
  fillHeight?: boolean;
};

/** Async band for stacks/subpages — not main tabs (use `TabBootBody`). */
export function StableSlot({
  style,
  loading,
  skeleton,
  children,
  contentKey,
  minDisplayMs,
  variant = "section",
  fillHeight = false,
}: StableSlotProps) {
  return (
    <CrossfadeBand
      loading={loading}
      skeleton={skeleton}
      style={[styles.slot, style]}
      minDisplayMs={minDisplayMs}
      variant={variant}
      sessionKey={contentKey != null ? String(contentKey) : undefined}
      fillHeight={fillHeight}
    >
      {children}
    </CrossfadeBand>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: "100%",
  },
});
