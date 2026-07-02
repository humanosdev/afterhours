import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isShareLibraryNativeAvailable } from "../../lib/shareLibraryNative";
import { type ShareCropViewportHandle } from "../create/ShareCropViewport";
import {
  ShareLibraryMediaGrid,
  type ShareLibraryMediaGridHandle,
} from "../shares/ShareLibraryMediaGrid";
import {
  AvatarPhotoListHeader,
  avatarPhotoHeaderScrollHeight,
  avatarPhotoPreviewBandHeight,
} from "./AvatarPhotoListHeader";

type AvatarPhotoComposerProps = {
  onClose: () => void;
  onDone: (croppedUri: string) => void;
};

/** Profile photo picker — circular crop + in-app Recents grid (same flow as new post). */
export function AvatarPhotoComposer({ onClose, onDone }: AvatarPhotoComposerProps) {
  const insets = useSafeAreaInsets();
  const cropRef = useRef<ShareCropViewportHandle>(null);
  const gridRef = useRef<ShareLibraryMediaGridHandle>(null);
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const [activeImageSize, setActiveImageSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [exporting, setExporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const nativeGridAvailable = isShareLibraryNativeAvailable();
  const previewHeight = avatarPhotoPreviewBandHeight();
  const headerScrollHeight = avatarPhotoHeaderScrollHeight(previewHeight);
  const bottomInset = insets.bottom + 16;
  const showFallback = !nativeGridAvailable;

  const handleActiveUriChange = useCallback(
    (uri: string | null, size?: { width: number; height: number }) => {
      setActiveUri(uri);
      if (uri && size && size.width > 0 && size.height > 0) {
        setActiveImageSize(size);
      } else {
        setActiveImageSize(null);
      }
    },
    []
  );

  const listHeader = useMemo(
    () => (
      <AvatarPhotoListHeader
        activeUri={activeUri}
        previewHeight={previewHeight}
        cropRef={cropRef}
        knownImageSize={activeImageSize}
      />
    ),
    [activeUri, previewHeight, activeImageSize]
  );

  const expandPreview = useCallback(() => {
    gridRef.current?.scrollToTop(true);
  }, []);

  async function pickFromLibrary() {
    if (picking) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        handleActiveUriChange(
          asset.uri,
          asset.width && asset.height ? { width: asset.width, height: asset.height } : undefined
        );
        expandPreview();
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleDone() {
    if (!activeUri || exporting) return;
    setExporting(true);
    try {
      const cropped = await cropRef.current?.exportCrop();
      if (cropped) onDone(cropped);
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <X size={26} color="#fff" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile photo</Text>
        <Pressable
          onPress={() => void handleDone()}
          disabled={!activeUri || exporting}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          {exporting ? (
            <ActivityIndicator color="#0095f6" size="small" />
          ) : (
            <Text style={[styles.nextLabel, !activeUri && styles.nextLabelDisabled]}>Done</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.gridHost}>
        {showFallback ? (
          <View style={[styles.fallback, { paddingBottom: bottomInset }]}>
            <Text style={styles.fallbackText}>Open your library to choose a profile photo.</Text>
            <Pressable
              onPress={() => void pickFromLibrary()}
              disabled={picking}
              style={[styles.pickBtn, picking && styles.pickBtnDisabled]}
              accessibilityRole="button"
            >
              {picking ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <ImagePlus size={22} color="#000" strokeWidth={2} />
                  <Text style={styles.pickBtnLabel}>Open photo library</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <ShareLibraryMediaGrid
            ref={gridRef}
            activeUri={activeUri}
            onActiveUriChange={handleActiveUriChange}
            selectedUris={activeUri ? [activeUri] : []}
            onSelectionChange={(uris) => handleActiveUriChange(uris[0] ?? null)}
            bottomInset={bottomInset}
            singleSelect
            listHeader={listHeader}
            headerScrollHeight={headerScrollHeight}
            onExpandPreview={expandPreview}
            scrollEnabled
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    minHeight: 48,
  },
  headerBtn: {
    minWidth: 64,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  nextLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0095f6",
  },
  nextLabelDisabled: {
    opacity: 0.35,
  },
  gridHost: {
    flex: 1,
    minHeight: 0,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  fallbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  pickBtnDisabled: {
    opacity: 0.5,
  },
  pickBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
});
