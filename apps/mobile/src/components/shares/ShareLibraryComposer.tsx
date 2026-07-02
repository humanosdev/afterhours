import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { Image } from "expo-image";
import { useEffect, useState, type ComponentType } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mediaLexicon } from "../../content/mediaLexicon";
import { isShareLibraryNativeAvailable } from "../../lib/shareLibraryNative";

const MAX_SELECT = 10;

type ShareLibraryComposerProps = {
  selectedUris: string[];
  onSelectionChange: (uris: string[]) => void;
  onClose: () => void;
  bottomInset: number;
};

type MediaGridProps = {
  selectedUris: string[];
  onSelectionChange: (uris: string[]) => void;
  bottomInset: number;
};

/** IG-style share library — live grid when native module linked, else multi-picker fallback. */
export function ShareLibraryComposer({
  selectedUris,
  onSelectionChange,
  onClose,
  bottomInset,
}: ShareLibraryComposerProps) {
  const insets = useSafeAreaInsets();
  const nativeGridAvailable = isShareLibraryNativeAvailable();
  const [MediaGrid, setMediaGrid] = useState<ComponentType<MediaGridProps> | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!nativeGridAvailable) return;
    let cancelled = false;
    void import("./ShareLibraryMediaGrid").then((mod) => {
      if (!cancelled) setMediaGrid(() => mod.ShareLibraryMediaGrid);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeGridAvailable]);

  async function pickMore() {
    if (picking) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const remaining = MAX_SELECT - selectedUris.length;
      if (remaining <= 0) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) return;

      const next = [...selectedUris];
      for (const asset of result.assets) {
        if (!asset.uri || next.length >= MAX_SELECT) break;
        if (!next.includes(asset.uri)) next.push(asset.uri);
      }
      onSelectionChange(next);
    } finally {
      setPicking(false);
    }
  }

  function removeAt(index: number) {
    onSelectionChange(selectedUris.filter((_, i) => i !== index));
  }

  const showFallback = !nativeGridAvailable || !MediaGrid;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close">
          <X size={26} color="#fff" strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>{mediaLexicon.share.labelPlural}</Text>
        <View style={styles.iconBtn} />
      </View>

      {showFallback ? (
        <View style={[styles.fallbackBody, { paddingBottom: bottomInset + 120 }]}>
          <Text style={styles.fallbackTitle}>Select up to {MAX_SELECT} photos</Text>
          <Text style={styles.fallbackBodyText}>
            Tap below to open your library. Rebuild the dev app once to unlock the live in-app grid.
          </Text>
          <Pressable
            onPress={() => void pickMore()}
            disabled={picking || selectedUris.length >= MAX_SELECT}
            style={[styles.pickBtn, (picking || selectedUris.length >= MAX_SELECT) && styles.pickBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Open photo library"
          >
            {picking ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <ImagePlus size={22} color="#000" strokeWidth={2} />
                <Text style={styles.pickBtnLabel}>
                  {selectedUris.length > 0 ? "Add more photos" : "Open photo library"}
                </Text>
              </>
            )}
          </Pressable>

          {selectedUris.length > 0 ? (
            <FlatList
              data={selectedUris}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              numColumns={3}
              columnWrapperStyle={styles.fallbackGridRow}
              contentContainerStyle={styles.fallbackGrid}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => removeAt(index)} style={styles.fallbackCell}>
                  <Image source={{ uri: item }} style={styles.fallbackThumb} contentFit="cover" />
                  <View style={styles.fallbackOrder}>
                    <Text style={styles.fallbackOrderText}>{index + 1}</Text>
                  </View>
                </Pressable>
              )}
            />
          ) : null}
        </View>
      ) : (
        <MediaGrid
          selectedUris={selectedUris}
          onSelectionChange={onSelectionChange}
          bottomInset={bottomInset}
        />
      )}

      {selectedUris.length > 0 && !showFallback ? (
        <View style={[styles.selectionDock, { paddingBottom: bottomInset + 8 }]}>
          <FlatList
            horizontal
            data={selectedUris}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectionRow}
            renderItem={({ item, index }) => (
              <View style={styles.selectionThumbWrap}>
                <Image source={{ uri: item }} style={styles.selectionThumb} contentFit="cover" />
                <View style={styles.selectionOrder}>
                  <Text style={styles.selectionOrderText}>{index + 1}</Text>
                </View>
              </View>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    minHeight: 52,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  fallbackBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  fallbackBodyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  pickBtn: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 220,
  },
  pickBtnDisabled: {
    opacity: 0.45,
  },
  pickBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  fallbackGrid: {
    marginTop: 24,
    gap: 4,
  },
  fallbackGridRow: {
    gap: 4,
  },
  fallbackCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: "33%",
    borderRadius: 4,
    overflow: "hidden",
  },
  fallbackThumb: {
    width: "100%",
    height: "100%",
  },
  fallbackOrder: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackOrderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  selectionDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.92)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10,
  },
  selectionRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  selectionThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 6,
    overflow: "hidden",
  },
  selectionThumb: {
    width: "100%",
    height: "100%",
  },
  selectionOrder: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionOrderText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});
