import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useImageBackdropColor } from "../../hooks/useImageBackdropColor";
import type { ShareAspectFormat } from "../../lib/shareAspect";
import { shareCropWindowSize } from "../../theme/mediaLayout";
import { ShareCropViewport, type ShareCropViewportHandle } from "../create/ShareCropViewport";

const ALBUM_ROW_HEIGHT = 40;

type ShareNewPostListHeaderProps = {
  activeUri: string | null;
  aspectFormat: ShareAspectFormat;
  previewHeight: number;
  cropRef: React.RefObject<ShareCropViewportHandle | null>;
  knownImageSize?: { width: number; height: number } | null;
  onAspectFormatChange: (format: ShareAspectFormat) => void;
};

export const ShareNewPostListHeader = memo(function ShareNewPostListHeader({
  activeUri,
  aspectFormat,
  previewHeight,
  cropRef,
  knownImageSize = null,
  onAspectFormatChange,
}: ShareNewPostListHeaderProps) {
  const cropWindow = useMemo(
    () => shareCropWindowSize(undefined, aspectFormat),
    [aspectFormat]
  );
  const backdropColor = useImageBackdropColor(activeUri);

  return (
    <View>
      <View
        style={[
          styles.previewBand,
          { height: previewHeight, backgroundColor: activeUri ? backdropColor : "#000" },
        ]}
      >
        {activeUri ? (
          <ShareCropViewport
            ref={cropRef}
            sourceUri={activeUri}
            aspectFormat={aspectFormat}
            onAspectFormatChange={onAspectFormatChange}
            knownImageSize={knownImageSize}
            showAspectToggle
            style={{ width: cropWindow.width, height: cropWindow.height }}
          />
        ) : (
          <View style={styles.previewEmpty}>
            <Text style={styles.previewEmptyText}>Choose a photo below</Text>
          </View>
        )}
      </View>
      <View style={styles.albumRow}>
        <Text style={styles.albumLabel}>Recents</Text>
        <ChevronDown size={18} color="#fff" strokeWidth={2.2} />
      </View>
    </View>
  );
});

export function shareNewPostHeaderScrollHeight(previewHeight: number): number {
  return previewHeight + ALBUM_ROW_HEIGHT;
}

const styles = StyleSheet.create({
  previewBand: {
    width: "100%",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmpty: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
  previewEmptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
  },
  albumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#000",
    minHeight: ALBUM_ROW_HEIGHT,
  },
  albumLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
