import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { glass } from "../theme/glass";

type GlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
};

export function GlassSurface({ children, style, muted = false }: GlassSurfaceProps) {
  return <View style={[muted ? glass.surfaceMuted : glass.surface, style]}>{children}</View>;
}
