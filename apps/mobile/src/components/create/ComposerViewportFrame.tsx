import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { composerChrome } from "../../theme/composerLayout";
import { colors } from "../../theme/colors";

type ComposerViewportFrameProps = {
  width: number;
  height: number;
  /** Moment shell — no hairline border, IG cutout. */
  borderless?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * WYSIWYG capture frame — only pixels inside this box appear in the published moment.
 */
export function ComposerViewportFrame({
  width,
  height,
  borderless = false,
  style,
  children,
}: ComposerViewportFrameProps) {
  return (
    <View
      style={[
        styles.frame,
        borderless && styles.frameBorderless,
        {
          width,
          height,
          borderRadius: borderless ? composerChrome.momentCutoutRadius : composerChrome.frameRadius,
        },
        style,
      ]}
    >
      <View style={styles.clip}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.bgPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  frameBorderless: {
    borderWidth: 0,
    backgroundColor: "#000",
  },
  clip: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
});
