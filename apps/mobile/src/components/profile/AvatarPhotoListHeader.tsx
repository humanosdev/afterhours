import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useImageBackdropColor } from "../../hooks/useImageBackdropColor";
import { avatarCropWindowSize } from "../../theme/mediaLayout";
import { ShareCropViewport, type ShareCropViewportHandle } from "../create/ShareCropViewport";

const ALBUM_ROW_HEIGHT = 40;
const AVATAR_BAND_PAD = 28;

type AvatarPhotoListHeaderProps = {
  activeUri: string | null;
  previewHeight: number;
  cropRef: React.RefObject<ShareCropViewportHandle | null>;
  knownImageSize?: { width: number; height: number } | null;
};

export const AvatarPhotoListHeader = memo(function AvatarPhotoListHeader({
  activeUri,
  previewHeight,
  cropRef,
  knownImageSize = null,
}: AvatarPhotoListHeaderProps) {
  const cropWindow = useMemo(() => avatarCropWindowSize(), []);
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
            aspectFormat="square"
            onAspectFormatChange={() => {}}
            variant="avatar"
            showAspectToggle={false}
            knownImageSize={knownImageSize}
            style={{ width: cropWindow.width, height: cropWindow.height }}
          />
        ) : (
          <View
            style={[
              styles.previewEmpty,
              {
                width: cropWindow.width,
                height: cropWindow.height,
                borderRadius: cropWindow.width / 2,
              },
            ]}
          >
            <Text style={styles.previewEmptyText}>Choose a photo</Text>
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

export function avatarPhotoHeaderScrollHeight(previewHeight: number): number {
  return previewHeight + ALBUM_ROW_HEIGHT;
}

export function avatarPhotoPreviewBandHeight(): number {
  const crop = avatarCropWindowSize();
  return crop.height + AVATAR_BAND_PAD * 2;
}

const styles = StyleSheet.create({
  previewBand: {
    width: "100%",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: AVATAR_BAND_PAD,
  },
  previewEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141820",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewEmptyText: {
    fontSize: 13,
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
