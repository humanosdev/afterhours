import { Image } from "expo-image";
import { ChevronUp, Search, Smile, Sticker, Type } from "lucide-react-native";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector, Pressable } from "react-native-gesture-handler";
import Animated, {
  clamp,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { mediaLexicon } from "../../content/mediaLexicon";
import { filterMomentEmojis } from "../../lib/momentEmojis";
import {
  MOMENT_STICKER_PACKS,
  filterMomentStickers,
  type MomentStickerSourceFilter,
} from "../../lib/momentDefaultStickers";
import {
  MOMENT_TEXT_FONTS,
  defaultOverlayPosition,
  momentFontById,
  newOverlayId,
  type MomentOverlay,
  type MomentStickerItem,
  type MomentTextFontId,
} from "../../lib/momentEditor";
import { MomentStickerBadgeView } from "./MomentStickerBadgeView";

type RailMode = "stickers" | "emoji" | "text";

type MomentEditorRailProps = {
  builtinStickers: MomentStickerItem[];
  deviceStickers: MomentStickerItem[];
  stickersLoading?: boolean;
  overlays: MomentOverlay[];
  activeOverlayId: string | null;
  onAddSticker: (overlay: Extract<MomentOverlay, { kind: "sticker" }>) => void;
  onAddEmoji: (overlay: Extract<MomentOverlay, { kind: "emoji" }>) => void;
  onAddText: (overlay: Extract<MomentOverlay, { kind: "text" }>) => void;
  onUpdateText: (overlayId: string, text: string, fontId: MomentTextFontId) => void;
  onSelectOverlay: (overlayId: string | null) => void;
  onEnsureStickerUri: (sticker: MomentStickerItem) => Promise<string | null>;
  onRefreshDeviceStickers?: () => void;
  onImportFromIMessage?: () => Promise<MomentStickerItem | null>;
  importingFromIMessage?: boolean;
  publishing?: boolean;
  onPublish: () => void;
};

const COLLAPSED_HEIGHT = 14;
const HEADER_HEIGHT = 34;
const BODY_HEIGHT = 196;
const EXPANDED_HEIGHT = COLLAPSED_HEIGHT + HEADER_HEIGHT + BODY_HEIGHT;
const EXPAND_MS = 260;
const COLLAPSE_MS = 210;
const EXPAND_EASING = Easing.out(Easing.cubic);
const COLLAPSE_EASING = Easing.inOut(Easing.cubic);

function collapseRail(expandSv: SharedValue<number>, onCollapsed?: () => void) {
  expandSv.value = withTiming(0, { duration: COLLAPSE_MS, easing: COLLAPSE_EASING });
  onCollapsed?.();
}

function expandRail(expandSv: SharedValue<number>, onExpanded?: () => void) {
  expandSv.value = withTiming(1, { duration: EXPAND_MS, easing: EXPAND_EASING });
  onExpanded?.();
}

type StickerPackFilter = "all" | (typeof MOMENT_STICKER_PACKS)[number]["id"];

export function MomentEditorRail({
  builtinStickers,
  deviceStickers,
  stickersLoading = false,
  overlays,
  activeOverlayId,
  onAddSticker,
  onAddEmoji,
  onAddText,
  onUpdateText,
  onSelectOverlay,
  onEnsureStickerUri,
  onRefreshDeviceStickers,
  onImportFromIMessage,
  importingFromIMessage = false,
  publishing = false,
  onPublish,
}: MomentEditorRailProps) {
  const [mode, setMode] = useState<RailMode>("stickers");
  const [searchQuery, setSearchQuery] = useState("");
  const [stickerSource, setStickerSource] = useState<MomentStickerSourceFilter>("builtin");
  const [packFilter, setPackFilter] = useState<StickerPackFilter>("all");
  const expandSv = useSharedValue(0);
  const dragStartSv = useSharedValue(0);
  const yoursLoadedRef = useRef(false);
  const isExpandedRef = useRef(false);

  const markExpanded = () => {
    isExpandedRef.current = true;
  };
  const markCollapsed = () => {
    isExpandedRef.current = false;
  };

  const allStickers = useMemo(
    () => [...builtinStickers, ...deviceStickers],
    [builtinStickers, deviceStickers]
  );

  const activeText = overlays.find(
    (o): o is Extract<MomentOverlay, { kind: "text" }> =>
      o.kind === "text" && o.id === activeOverlayId
  );
  const [draftText, setDraftText] = useState("");

  const openEditor = () => {
    expandRail(expandSv, markExpanded);
  };

  const collapseEditor = () => {
    collapseRail(expandSv, markCollapsed);
  };

  const toggleHandlePress = () => {
    if (isExpandedRef.current) {
      collapseEditor();
      return;
    }
    openEditor();
  };

  useEffect(() => {
    if (activeText) {
      setMode("text");
      setDraftText(activeText.text);
      openEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand once when selection changes
  }, [activeText?.id, activeText?.text]);

  const filteredStickers = useMemo(
    () => filterMomentStickers(allStickers, searchQuery, stickerSource, packFilter),
    [allStickers, packFilter, searchQuery, stickerSource]
  );

  const filteredEmojis = useMemo(
    () => filterMomentEmojis(mode === "emoji" ? searchQuery : ""),
    [mode, searchQuery]
  );

  useEffect(() => {
    if (stickerSource !== "yours") {
      yoursLoadedRef.current = false;
      return;
    }
    if (yoursLoadedRef.current) return;
    yoursLoadedRef.current = true;
    onRefreshDeviceStickers?.();
  }, [onRefreshDeviceStickers, stickerSource]);

  const panelStyle = useAnimatedStyle(() => ({
    height: interpolate(expandSv.value, [0, 1], [COLLAPSED_HEIGHT, EXPANDED_HEIGHT]),
    overflow: "hidden" as const,
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandSv.value, [0, 0.08, 1], [0, 0, 1]),
  }));

  const handleHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandSv.value, [0, 0.15], [1, 0]),
  }));

  const sheetPan = Gesture.Pan()
    .activeOffsetY([-14, 14])
    .failOffsetX([-12, 12])
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      dragStartSv.value = expandSv.value;
    })
    .onUpdate((event) => {
      expandSv.value = clamp(
        dragStartSv.value - event.translationY / (EXPANDED_HEIGHT - COLLAPSED_HEIGHT),
        0,
        1
      );
    })
    .onEnd((event) => {
      const shouldOpen =
        event.velocityY < -450
          ? true
          : event.velocityY > 450
            ? false
            : expandSv.value > 0.38;
      expandSv.value = withTiming(shouldOpen ? 1 : 0, {
        duration: shouldOpen ? EXPAND_MS : COLLAPSE_MS,
        easing: shouldOpen ? EXPAND_EASING : COLLAPSE_EASING,
      });
      if (shouldOpen) {
        runOnJS(markExpanded)();
      } else {
        runOnJS(markCollapsed)();
      }
    });

  async function handleStickerPress(sticker: MomentStickerItem) {
    const pos = defaultOverlayPosition();

    if (sticker.badge) {
      onAddSticker({
        id: newOverlayId(),
        kind: "sticker",
        badge: sticker.badge,
        ...pos,
      });
      collapseEditor();
      return;
    }

    if (sticker.emojiGlyph) {
      onAddSticker({
        id: newOverlayId(),
        kind: "sticker",
        emojiGlyph: sticker.emojiGlyph,
        ...pos,
      });
      collapseEditor();
      return;
    }

    const uri = sticker.uri ?? (await onEnsureStickerUri(sticker));
    if (!uri) return;
    onAddSticker({
      id: newOverlayId(),
      kind: "sticker",
      uri,
      assetId: sticker.assetId,
      ...pos,
    });
    collapseRail(expandSv);
  }

  function handleEmojiPress(emoji: string) {
    const pos = defaultOverlayPosition();
    onAddEmoji({
      id: newOverlayId(),
      kind: "emoji",
      emoji,
      ...pos,
    });
    collapseRail(expandSv);
  }

  function handleDraftChange(text: string) {
    setDraftText(text);
    if (activeText) {
      onUpdateText(activeText.id, text, activeText.fontId);
    }
  }

  function handleNewText() {
    onSelectOverlay(null);
    setDraftText("");
  }

  function handleFontPress(fontId: MomentTextFontId) {
    const font = momentFontById(fontId);
    if (activeText) {
      onUpdateText(activeText.id, activeText.text, fontId);
      onSelectOverlay(activeText.id);
      collapseEditor();
      return;
    }
    const text = draftText.trim() || font.previewText;
    const textCount = overlays.filter((o) => o.kind === "text").length;
    const pos = defaultOverlayPosition();
    const overlay = {
      id: newOverlayId(),
      kind: "text" as const,
      text,
      fontId,
      x: pos.x,
      y: Math.min(0.88, pos.y - textCount * 0.06),
      scale: pos.scale,
    };
    onAddText(overlay);
    onSelectOverlay(overlay.id);
    setDraftText(text);
    collapseRail(expandSv);
  }

  return (
    <GestureDetector gesture={sheetPan}>
      <Animated.View style={[styles.panel, panelStyle]}>
        <Pressable
          onPress={toggleHandlePress}
          style={styles.handleRow}
          accessibilityRole="button"
          accessibilityLabel="Show or hide editor tools"
        >
          <View style={styles.handleBar} />
          <Animated.View style={[styles.handleHint, handleHintStyle]}>
            <ChevronUp size={12} color="rgba(255,255,255,0.45)" strokeWidth={2.5} />
          </Animated.View>
        </Pressable>

        <Animated.View style={[styles.chrome, chromeStyle]}>
          <View style={styles.headerRow}>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode("stickers")}
                style={[styles.modeChip, mode === "stickers" && styles.modeChipActive]}
              >
                <Sticker size={12} color={mode === "stickers" ? "#fff" : "rgba(255,255,255,0.55)"} />
                <Text style={[styles.modeLabel, mode === "stickers" && styles.modeLabelActive]}>
                  Stickers
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("emoji")}
                style={[styles.modeChip, mode === "emoji" && styles.modeChipActive]}
              >
                <Smile size={12} color={mode === "emoji" ? "#fff" : "rgba(255,255,255,0.55)"} />
                <Text style={[styles.modeLabel, mode === "emoji" && styles.modeLabelActive]}>
                  Emoji
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("text")}
                style={[styles.modeChip, mode === "text" && styles.modeChipActive]}
              >
                <Type size={12} color={mode === "text" ? "#fff" : "rgba(255,255,255,0.55)"} />
                <Text style={[styles.modeLabel, mode === "text" && styles.modeLabelActive]}>
                  Text
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={onPublish}
              disabled={publishing}
              style={[styles.postBtn, publishing && styles.postBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={mediaLexicon.publish.post}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.postLabel}>{mediaLexicon.publish.post}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.body}>
            {mode === "stickers" || mode === "emoji" ? (
              <View style={styles.searchRow}>
                <Search size={13} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={mode === "stickers" ? "Search stickers…" : "Search emoji…"}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
              </View>
            ) : null}

            {mode === "stickers" ? (
              <>
                <View style={styles.sourceRow}>
                  <Pressable
                    onPress={() => setStickerSource("builtin")}
                    style={[styles.sourceChip, stickerSource === "builtin" && styles.sourceChipActive]}
                  >
                    <Text
                      style={[
                        styles.sourceLabel,
                        stickerSource === "builtin" && styles.sourceLabelActive,
                      ]}
                    >
                      Built-in
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStickerSource("yours")}
                    style={[styles.sourceChip, stickerSource === "yours" && styles.sourceChipActive]}
                  >
                    <Text
                      style={[
                        styles.sourceLabel,
                        stickerSource === "yours" && styles.sourceLabelActive,
                      ]}
                    >
                      Yours
                    </Text>
                  </Pressable>
                </View>

                {stickerSource === "yours" ? (
                  <Pressable
                    onPress={() => {
                      void onImportFromIMessage?.();
                    }}
                    disabled={importingFromIMessage || !onImportFromIMessage}
                    style={styles.importBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Add sticker from iMessage"
                  >
                    {importingFromIMessage ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.importLabel}>+ iMessage</Text>
                    )}
                  </Pressable>
                ) : null}

                {stickerSource === "builtin" ? (
                  <ScrollView
                    horizontal
                    bounces={false}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.packRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable
                      onPress={() => setPackFilter("all")}
                      style={[styles.packChip, packFilter === "all" && styles.packChipActive]}
                    >
                      <Text style={[styles.packLabel, packFilter === "all" && styles.packLabelActive]}>
                        All
                      </Text>
                    </Pressable>
                    {MOMENT_STICKER_PACKS.map((pack) => {
                      const active = packFilter === pack.id;
                      return (
                        <Pressable
                          key={pack.id}
                          onPress={() => setPackFilter(pack.id)}
                          style={[styles.packChip, active && styles.packChipActive]}
                        >
                          <Text style={[styles.packLabel, active && styles.packLabelActive]}>
                            {pack.name}
                          </Text>
                          {pack.ageGate ? (
                            <Text style={[styles.packHint, active && styles.packHintActive]}>
                              {pack.ageGate}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <ScrollView
                  horizontal
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {stickersLoading && stickerSource === "yours" && filteredStickers.length === 0 ? (
                    <View style={styles.loadingCell}>
                      <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
                    </View>
                  ) : null}
                  {filteredStickers.map((sticker) => (
                    <StickerThumb
                      key={sticker.id}
                      sticker={sticker}
                      onPress={() => void handleStickerPress(sticker)}
                      onEnsureUri={onEnsureStickerUri}
                    />
                  ))}
                  {!stickersLoading && filteredStickers.length === 0 ? (
                    <Text style={styles.hint}>
                      {stickerSource === "yours"
                        ? "Tap + iMessage to add stickers."
                        : "No stickers match that search."}
                    </Text>
                  ) : null}
                </ScrollView>
              </>
            ) : null}

            {mode === "emoji" ? (
              <ScrollView
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredEmojis.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleEmojiPress(item.emoji)}
                    style={styles.emojiCell}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.emoji}`}
                  >
                    <Text style={styles.emojiGlyph}>{item.emoji}</Text>
                  </Pressable>
                ))}
                {filteredEmojis.length === 0 ? (
                  <Text style={styles.hint}>No emoji match that search.</Text>
                ) : null}
              </ScrollView>
            ) : null}

            {mode === "text" ? (
              <>
                <View style={styles.textEditRow}>
                  <TextInput
                    value={draftText}
                    onChangeText={handleDraftChange}
                    placeholder="Type your text…"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.textEditInput}
                    autoCorrect
                    autoCapitalize="sentences"
                    returnKeyType="done"
                    onFocus={openEditor}
                  />
                  <Pressable
                    onPress={handleNewText}
                    style={styles.newTextBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Add another text overlay"
                  >
                    <Text style={styles.newTextLabel}>+ New</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fontRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {MOMENT_TEXT_FONTS.map((font) => {
                    const selected = activeText?.fontId === font.id;
                    return (
                      <Pressable
                        key={font.id}
                        onPress={() => handleFontPress(font.id)}
                        style={[styles.fontChip, selected && styles.fontChipSelected]}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontFamily: font.fontFamily === "System" ? undefined : font.fontFamily,
                            fontWeight: font.fontWeight,
                            fontSize: 14,
                          }}
                        >
                          {font.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const StickerThumb = memo(function StickerThumb({
  sticker,
  onPress,
  onEnsureUri,
}: {
  sticker: MomentStickerItem;
  onPress: () => void;
  onEnsureUri: (sticker: MomentStickerItem) => Promise<string | null>;
}) {
  const [uri, setUri] = useState<string | null>(sticker.uri);
  const resolveStartedRef = useRef(false);

  useEffect(() => {
    setUri(sticker.uri);
    resolveStartedRef.current = false;
  }, [sticker.id, sticker.uri]);

  useEffect(() => {
    if (sticker.badge || sticker.emojiGlyph || sticker.uri || resolveStartedRef.current) return;
    resolveStartedRef.current = true;
    void onEnsureUri(sticker).then((next) => {
      if (next) setUri(next);
    });
  }, [onEnsureUri, sticker.assetId, sticker.badge, sticker.emojiGlyph, sticker.id, sticker.uri]);

  if (sticker.badge) {
    const lines = sticker.badge.text.split("\n").filter(Boolean);
    const lineCount = lines.length;
    const maxWordLen = Math.max(...lines.map((line) => line.length), 1);
    const cellHeight = Math.min(72, Math.max(44, 14 + lineCount * 10));
    const cellWidth = Math.min(68, Math.max(44, 26 + maxWordLen * 3));
    return (
      <Pressable
        onPress={onPress}
        style={[styles.stickerCell, { width: cellWidth, height: cellHeight }]}
        accessibilityRole="button"
      >
        <MomentStickerBadgeView badge={sticker.badge} compact lineCount={lineCount} />
      </Pressable>
    );
  }

  if (sticker.emojiGlyph) {
    return (
      <Pressable onPress={onPress} style={styles.stickerCell} accessibilityRole="button">
        <Text style={styles.stickerEmojiGlyph} numberOfLines={1}>
          {sticker.emojiGlyph}
        </Text>
      </Pressable>
    );
  }

  const imageUri = uri ?? sticker.uri;
  return (
    <Pressable onPress={onPress} style={styles.stickerCell} accessibilityRole="button">
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.stickerImage}
          contentFit="contain"
          transition={0}
          recyclingKey={sticker.id}
          cachePolicy="memory-disk"
          priority="low"
        />
      ) : (
        <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 10,
  },
  handleRow: {
    height: COLLAPSED_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 32,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  handleHint: {
    position: "absolute",
    top: 6,
  },
  chrome: {
    height: HEADER_HEIGHT + BODY_HEIGHT,
  },
  headerRow: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  body: {
    height: BODY_HEIGHT,
    overflow: "hidden",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modeChipActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
  },
  modeLabelActive: {
    color: "#fff",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    paddingVertical: 0,
  },
  sourceRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  sourceChip: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sourceChipActive: {
    backgroundColor: "rgba(0,149,246,0.18)",
    borderColor: "rgba(0,149,246,0.55)",
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
  },
  sourceLabelActive: {
    color: "#fff",
  },
  importBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    backgroundColor: "rgba(0,149,246,0.22)",
    borderWidth: 1,
    borderColor: "rgba(0,149,246,0.55)",
    minWidth: 88,
    alignItems: "center",
  },
  importLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  packRow: {
    alignItems: "center",
    gap: 4,
    paddingRight: 4,
    marginBottom: 4,
  },
  packChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  packChipActive: {
    backgroundColor: "rgba(255,77,109,0.18)",
    borderColor: "rgba(255,77,109,0.55)",
  },
  packLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  packLabelActive: {
    color: "#fff",
  },
  packHint: {
    fontSize: 8,
    fontWeight: "800",
    color: "rgba(255,77,109,0.75)",
  },
  packHintActive: {
    color: "#ff8fa3",
  },
  scrollContent: {
    alignItems: "flex-end",
    gap: 6,
    paddingRight: 2,
  },
  textEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  textEditInput: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  newTextBtn: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  newTextLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  fontRow: {
    alignItems: "center",
    gap: 5,
  },
  fontChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  fontChipSelected: {
    borderWidth: 1.5,
    borderColor: "#0095f6",
  },
  loadingCell: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerImage: {
    width: "100%",
    height: "100%",
  },
  stickerEmojiGlyph: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
  },
  emojiCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emojiGlyph: {
    fontSize: 26,
    lineHeight: 30,
  },
  hint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    maxWidth: 220,
    lineHeight: 14,
  },
  postBtn: {
    minWidth: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  postBtnDisabled: {
    opacity: 0.55,
  },
  postLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
