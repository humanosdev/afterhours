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
  /** `fitted` = full page boot hold. `section` = band-only while loading (hub rows, lists). */
  variant?: "fitted" | "section" | "micro";
  /** One fitted boot hold per cold app start (main tabs). */
  appSessionBoot?: boolean;
  /** Tab route id — one boot skeleton on first focus per cold launch. */
  tabBootKey?: string;
  /** Pin scroll band height while skeleton is up (tab cold open). */
  lockHeightWhileLoading?: boolean;
  fillHeight?: boolean;
};

/** Async band with crossfade — skeleton reserves layout, content fades in. */
export function StableSlot({
  style,
  loading,
  skeleton,
  children,
  contentKey,
  minDisplayMs,
  variant = "fitted",
  appSessionBoot = false,
  tabBootKey,
  lockHeightWhileLoading = false,
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
      appSessionBoot={appSessionBoot}
      tabBootKey={tabBootKey}
      lockHeightWhileLoading={lockHeightWhileLoading}
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
