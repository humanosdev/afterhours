import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, RotateCcw, X, Zap, ZapOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mediaComposerCopy } from "../../content/mediaComposerCopy";
import { mediaLexicon } from "../../content/mediaLexicon";
import type { StoryCameraSurface } from "../../lib/storyCameraSurface";
import { useMomentStickers } from "../../hooks/useMomentStickers";
import type { MomentOverlay, MomentTextFontId } from "../../lib/momentEditor";
import type { ShareAspectFormat } from "../../lib/shareAspect";
import {
  emitStoryPostConfirmed,
  emitStoryPostFailed,
  makeOptimisticStoryId,
  type StoryPostStartPayload,
} from "../../lib/storyPostOptimistic";
import { profileUsernameLabel } from "../../lib/profileDisplay";
import { uploadStoryFromUri, type ComposerMode } from "../../lib/uploadStoryMedia";
import { useAuth } from "../../providers/AuthProvider";
import { useMyProfile } from "../../hooks/useMyProfile";
import { loadMomentImageLayout, momentLayoutFromDimensions } from "../../lib/momentMediaLayout";
import { exportMomentCrop } from "../../lib/momentCropExport";
import { composerChrome } from "../../theme/composerLayout";
import {
  MOMENT_PUBLISH_HEIGHT,
  MOMENT_PUBLISH_WIDTH,
  momentStageMetrics,
} from "../../theme/momentStageLayout";
import { colors } from "../../theme/colors";
import { mediaLayout } from "../../theme/mediaLayout";
import { captureRef } from "react-native-view-shot";
import { ModalGestureRoot } from "../ModalGestureRoot";
import { ComposerBottomModeMenu } from "./ComposerBottomModeMenu";
import { ComposerViewportFrame } from "./ComposerViewportFrame";
import {
  MomentMediaCanvas,
  type MomentMediaCanvasHandle,
} from "../moments/MomentMediaCanvas";
import { MomentDraggableOverlay } from "../moments/MomentDraggableOverlay";
import { MomentEditorRail } from "../moments/MomentEditorRail";
import { ShareNewPostComposer } from "../shares/ShareNewPostComposer";

/** Front-camera flash — brief overlay after shutter (never blocks capture). */
const SELFIE_SCREEN_FLASH_MS = 90;

function flashAccessibilityLabel(flashOn: boolean, facing: "front" | "back"): string {
  if (!flashOn) return "Flash off";
  return facing === "front" ? "Screen flash on" : "Flash on";
}

function toImageSize(
  width?: number | null,
  height?: number | null,
  fallback?: { width: number; height: number } | null
): { width: number; height: number } | null {
  if (width && height && width > 0 && height > 0) {
    return { width, height };
  }
  return fallback ?? null;
}

type StoryComposerModalProps = {
  visible: boolean;
  mode: ComposerMode;
  modeSwitchEnabled?: boolean;
  onModeChange?: (mode: ComposerMode) => void;
  onClose: () => void;
  onPosted: (payload: StoryPostStartPayload) => void;
};

function uploadErrorMessage(code: string | undefined, fallback: string): string {
  if (code === "read_failed") return mediaComposerCopy.modal.readFailed;
  if (code === "auth") return mediaLexicon.publish.signIn;
  return fallback || mediaComposerCopy.modal.uploadFailed;
}

function IgIconButton({
  onPress,
  disabled,
  children,
  label,
}: {
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.igIconBtn, disabled && styles.igIconBtnDisabled]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Create camera — WYSIWYG moments (9:16) + stories (4:5·1:1 hub feed).
 */
export function StoryComposerModal({
  visible,
  mode,
  modeSwitchEnabled = false,
  onModeChange,
  onClose,
  onPosted,
}: StoryComposerModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useMyProfile(user?.id);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const copy = mediaComposerCopy.modal;
  const cameraRef = useRef<CameraView>(null);
  const momentCropRef = useRef<MomentMediaCanvasHandle>(null);
  const momentStickerCaptureRef = useRef<View>(null);
  const publishCaptureRef = useRef<View>(null);
  const previewUriRef = useRef<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [surface, setSurface] = useState<StoryCameraSurface>("live");
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [shareAspect, setShareAspect] = useState<ShareAspectFormat>("portrait");
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [momentFillCutout, setMomentFillCutout] = useState(true);
  const [momentPreviewSize, setMomentPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [momentSourceSize, setMomentSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [shareActiveUri, setShareActiveUri] = useState<string | null>(null);
  const [screenFlashActive, setScreenFlashActive] = useState(false);
  const [overlays, setOverlays] = useState<MomentOverlay[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const {
    builtinStickers,
    deviceStickers,
    loading: stickersLoading,
    importing: importingStickers,
    refresh: refreshDeviceStickers,
    importFromIMessage,
    ensureUri: ensureStickerUri,
  } = useMomentStickers(visible && mode === "moments");
  const isPreview = surface === "preview" && !!previewUri;
  const shareLibraryActive = surface === "share-library";
  const showLiveCamera =
    !shareLibraryActive && Boolean(permission?.granted) && surface === "live" && !isPreview;
  const showCaptureChrome =
    !shareLibraryActive && (surface === "live" || surface === "unavailable");

  const flashAvailable = surface === "live" && cameraReady;
  const cameraFlash = flashOn && facing === "back" ? "on" : "off";
  const torchEnabled = flashOn && facing === "back" && flashAvailable;

  const momentStage = momentStageMetrics(windowWidth, windowHeight, insets);

  previewUriRef.current = previewUri;

  const showMomentPreview = useCallback(
    (uri: string, width?: number | null, height?: number | null) => {
      const size = toImageSize(width, height, null);
      const layout = size
        ? momentLayoutFromDimensions(size.width, size.height)
        : { fillCutout: true, width: 0, height: 0 };
      setMomentFillCutout(layout.fillCutout);
      setMomentSourceSize(size);
      setMomentPreviewSize({ width: momentStage.width, height: momentStage.height });
      setPreviewUri(uri);
      setSurface("preview");
      void Image.prefetch(uri);

      if (size) return;

      void loadMomentImageLayout(uri).then((refined) => {
        if (!refined || previewUriRef.current !== uri) return;
        setMomentFillCutout(refined.fillCutout);
        setMomentSourceSize({ width: refined.width, height: refined.height });
      });
    },
    [momentStage.width, momentStage.height]
  );

  const resetSession = useCallback(() => {
    setPreviewUri(null);
    setShareAspect("portrait");
    setFacing("back");
    setFlashOn(false);
    setUploading(false);
    setPicking(false);
    setMomentFillCutout(true);
    setMomentPreviewSize(null);
    setMomentSourceSize(null);
    setShareActiveUri(null);
    setSurface(mode === "shares" ? "share-library" : "live");
    setCameraReady(false);
    setScreenFlashActive(false);
    setOverlays([]);
    setActiveOverlayId(null);
  }, [mode]);

  const initCamera = useCallback(async () => {
    if (mode === "shares") {
      setSurface("share-library");
      return;
    }
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (!result.granted) {
        setSurface("unavailable");
        return;
      }
      setSurface("live");
    } catch {
      setSurface("unavailable");
    }
  }, [mode, permission, requestPermission]);

  const sessionOpenRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      sessionOpenRef.current = false;
      resetSession();
      return;
    }
    if (sessionOpenRef.current) return;
    sessionOpenRef.current = true;
    void initCamera();
  }, [visible, initCamera, resetSession]);

  function toggleFlash() {
    if (!flashAvailable) return;
    setFlashOn((v) => !v);
  }

  function flipCamera() {
    setFacing((f) => (f === "back" ? "front" : "back"));
  }

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  async function pickLibrary() {
    if (picking || uploading) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos", copy.permissionDenied);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: mediaLayout.ingest.pickerQuality,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      if (surface === "share-library" || mode === "shares") {
        setShareActiveUri(uri);
        setSurface("share-library");
        return;
      }
      showMomentPreview(uri, asset.width, asset.height);
    } catch {
      Alert.alert("Photos", copy.pickerFailed);
    } finally {
      setPicking(false);
    }
  }

  async function capture() {
    if (surface !== "live" || uploading || !cameraReady) return;
    const wantsScreenFlash = facing === "front" && flashOn;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (wantsScreenFlash) {
        setScreenFlashActive(true);
        flashTimer = setTimeout(() => setScreenFlashActive(false), SELFIE_SCREEN_FLASH_MS);
      }
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.92,
        /** Skip preview-matched downscale — full sensor resolution, fastest delivery. */
        skipProcessing: Platform.OS === "ios",
        shutterSound: false,
      });
      if (!photo?.uri) return;
      showMomentPreview(photo.uri, photo.width, photo.height);
    } catch {
      Alert.alert("Camera", copy.cameraStartFailed);
    } finally {
      if (flashTimer) clearTimeout(flashTimer);
      if (wantsScreenFlash) setScreenFlashActive(false);
    }
  }

  function retake() {
    setPreviewUri(null);
    setMomentFillCutout(true);
    setMomentPreviewSize(null);
    setMomentSourceSize(null);
    setOverlays([]);
    setActiveOverlayId(null);
    setSurface(permission?.granted ? "live" : "unavailable");
  }

  const updateOverlay = useCallback((id: string, patch: Partial<MomentOverlay>) => {
    setOverlays((prev) =>
      prev.map((row) => (row.id === id ? ({ ...row, ...patch } as MomentOverlay) : row))
    );
  }, []);

  const addStickerOverlay = useCallback((overlay: Extract<MomentOverlay, { kind: "sticker" }>) => {
    setOverlays((prev) => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
  }, []);

  const addEmojiOverlay = useCallback((overlay: Extract<MomentOverlay, { kind: "emoji" }>) => {
    setOverlays((prev) => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
  }, []);

  const addTextOverlay = useCallback((overlay: Extract<MomentOverlay, { kind: "text" }>) => {
    setOverlays((prev) => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
  }, []);

  const updateTextOverlay = useCallback(
    (overlayId: string, text: string, fontId: MomentTextFontId) => {
      setOverlays((prev) =>
        prev.map((row) =>
          row.id === overlayId && row.kind === "text" ? { ...row, text, fontId } : row
        )
      );
    },
    []
  );

  function handleTopClose() {
    if (isPreview) {
      retake();
      return;
    }
    close();
  }

  function handleModeChange(next: ComposerMode) {
    if (next === mode || uploading || picking) return;
    if (previewUri) {
      setPreviewUri(null);
      setShareAspect("portrait");
    }
    setMomentPreviewSize(null);
    setMomentSourceSize(null);
    setShareActiveUri(null);
    if (next === "shares") {
      setSurface("share-library");
    } else if (permission?.granted) {
      setSurface("live");
    } else {
      void requestPermission().then((result) => {
        setSurface(result.granted ? "live" : "unavailable");
      });
    }
    onModeChange?.(next);
  }

  async function publishInBackground(uploadUri: string, format?: ShareAspectFormat) {
    if (!user?.id) {
      Alert.alert("Could not publish", mediaLexicon.publish.signIn);
      return;
    }

    const payload: StoryPostStartPayload = {
      tempId: makeOptimisticStoryId(),
      mode,
      localUri: uploadUri,
      shareAspect: format,
      userId: user.id,
      username: profile ? profileUsernameLabel(profile, "You") : "You",
      avatarUrl: profile?.avatar_url ?? null,
      profileSlug: profile?.username?.trim().replace(/^@/, "") ?? null,
      createdAt: new Date().toISOString(),
    };

    resetSession();
    onPosted(payload);

    void uploadStoryFromUri(uploadUri, mode, { shareAspect: format }).then((result) => {
      if (!result.ok) {
        emitStoryPostFailed(payload.tempId);
        Alert.alert("Could not publish", uploadErrorMessage(result.code, result.message));
        return;
      }
      emitStoryPostConfirmed({
        tempId: payload.tempId,
        storyId: result.storyId,
        imageUrl: result.imageUrl,
      });
    });
  }

  async function onShareComposerNext(croppedUri: string, format: ShareAspectFormat) {
    if (uploading) return;
    setShareAspect(format);
    setUploading(true);
    try {
      await publishInBackground(croppedUri, format);
    } finally {
      setUploading(false);
    }
  }

  async function resolveUploadUri(): Promise<string | null> {
    if (!previewUri) return null;
    if (momentStickerCaptureRef.current && momentPreviewSize) {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const captured = await captureRef(momentStickerCaptureRef, {
          format: "jpg",
          quality: 1,
          width: MOMENT_PUBLISH_WIDTH,
          height: MOMENT_PUBLISH_HEIGHT,
        });
        if (captured) return captured;
      } catch (error) {
        if (__DEV__) {
          console.warn("[story-composer] preview capture failed", error);
        }
      }
    }
    if (momentPreviewSize) {
      const transform =
        momentCropRef.current?.getTransform() ?? {
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        };
      const cropped = await exportMomentCrop(
        previewUri,
        momentPreviewSize.width,
        momentPreviewSize.height,
        transform,
        momentFillCutout
      );
      if (cropped) return cropped;
    }
    return previewUri;
  }

  async function post() {
    if (!previewUri || uploading) return;
    setUploading(true);
    try {
      const uploadUri = await resolveUploadUri();
      if (!uploadUri) return;
      await publishInBackground(uploadUri);
    } catch (error) {
      if (__DEV__) {
        console.warn("[story-composer] moment publish failed", error);
      }
      Alert.alert("Could not publish", copy.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  function close() {
    if (uploading || picking) return;
    resetSession();
    onClose();
  }

  if (!visible) return null;

  const libraryBottomInset =
    insets.bottom + composerChrome.modeMenuHeight + composerChrome.modeMenuGap + 8;

  const modalProps = {
    visible: true as const,
    animationType: "none" as const,
    presentationStyle: "fullScreen" as const,
    onRequestClose: close,
    statusBarTranslucent: true,
  };

  if (shareLibraryActive) {
    return (
      <ModalGestureRoot {...modalProps}>
        <View style={styles.rootMoment}>
          <ShareNewPostComposer
            activeUri={shareActiveUri}
            onActiveUriChange={setShareActiveUri}
            aspectFormat={shareAspect}
            onAspectFormatChange={setShareAspect}
            onClose={close}
            onNext={onShareComposerNext}
            bottomInset={libraryBottomInset}
          />
          <View
            style={[styles.bottomDock, styles.bottomDockMoment, { paddingBottom: insets.bottom + 4 }]}
            pointerEvents="box-none"
          >
            <ComposerBottomModeMenu
              mode={mode}
              switchEnabled={modeSwitchEnabled}
              onModeChange={handleModeChange}
              disabled={uploading || picking}
            />
          </View>
          {uploading ? (
            <View style={styles.postingOverlay} pointerEvents="none">
              <Text style={styles.postingText}>{copy.publishing}</Text>
            </View>
          ) : null}
        </View>
      </ModalGestureRoot>
    );
  }

  return (
    <ModalGestureRoot {...modalProps}>
      <View style={styles.rootMoment}>
        <View
          style={[
            styles.frameHost,
            {
              left: momentStage.left,
              top: momentStage.top,
              width: momentStage.width,
              height: momentStage.height,
            },
          ]}
          pointerEvents="box-none"
        >
          <ComposerViewportFrame
            width={momentStage.width}
            height={momentStage.height}
            borderless
            style={styles.momentCutout}
          >
            {showLiveCamera ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                mode="picture"
                flash={cameraFlash}
                enableTorch={torchEnabled}
                mirror={facing === "front"}
                onCameraReady={handleCameraReady}
              />
            ) : null}
            {!showLiveCamera && surface === "live" ? (
              <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
            ) : null}
            {isPreview && previewUri ? (
              <View
                ref={momentStickerCaptureRef}
                collapsable={false}
                style={StyleSheet.absoluteFill}
              >
                <MomentMediaCanvas
                  key={previewUri}
                  ref={momentCropRef}
                  uri={previewUri}
                  fillCutout={momentFillCutout}
                  enableGestures
                  frameSize={{ width: momentStage.width, height: momentStage.height }}
                  knownImageSize={momentSourceSize}
                  onLayoutSize={setMomentPreviewSize}
                  style={StyleSheet.absoluteFill}
                />
                {momentPreviewSize
                  ? overlays.map((overlay) => (
                      <MomentDraggableOverlay
                        key={overlay.id}
                        overlay={overlay}
                        frameWidth={momentPreviewSize.width}
                        frameHeight={momentPreviewSize.height}
                        isActive={activeOverlayId === overlay.id}
                        onActivate={() => setActiveOverlayId(overlay.id)}
                        onChange={(patch) => updateOverlay(overlay.id, patch)}
                      />
                    ))
                  : null}
              </View>
            ) : null}
            {surface === "unavailable" ? (
              <View style={[StyleSheet.absoluteFill, styles.unavailableStage]}>
                <Text style={styles.unavailableTitle}>{copy.cameraUnavailableTitle}</Text>
                <Text style={styles.unavailableBody}>{copy.cameraUnavailableBody}</Text>
                <Pressable onPress={() => void pickLibrary()} style={styles.unavailableLibraryBtn}>
                  <Text style={styles.unavailableLibraryLabel}>{copy.openLibrary}</Text>
                </Pressable>
              </View>
            ) : null}
          </ComposerViewportFrame>

          {showCaptureChrome ? (
            <View style={styles.captureOverlay} pointerEvents="box-none">
              <View style={styles.captureRow}>
                <Pressable
                  onPress={() => void pickLibrary()}
                  disabled={uploading || picking}
                  style={styles.galleryBtn}
                  accessibilityRole="button"
                  accessibilityLabel={copy.openLibrary}
                >
                  {picking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ImagePlus size={22} color="#fff" strokeWidth={2} />
                  )}
                </Pressable>

                <Pressable
                  onPress={() => void capture()}
                  disabled={uploading || surface !== "live" || !cameraReady}
                  style={[styles.shutterOuter, (surface !== "live" || !cameraReady) && styles.shutterDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Capture photo"
                >
                  <View style={styles.shutterInner} />
                </Pressable>

                <Pressable
                  onPress={flipCamera}
                  disabled={surface !== "live" || uploading}
                  style={[styles.flipBtn, surface !== "live" && styles.flipBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Flip camera"
                >
                  <RotateCcw size={22} color="#fff" strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
          <IgIconButton onPress={handleTopClose} label="Close">
            <X size={26} color="#fff" strokeWidth={2} />
          </IgIconButton>
          <IgIconButton
            onPress={toggleFlash}
            label={
              !flashAvailable
                ? "Flash unavailable"
                : flashAccessibilityLabel(flashOn, facing)
            }
            disabled={!flashAvailable}
          >
            {flashOn ? (
              <Zap size={24} color="#fff" fill="#fff" strokeWidth={1.5} />
            ) : (
              <ZapOff size={24} color="#fff" strokeWidth={2} />
            )}
          </IgIconButton>
          <View style={styles.topBarSpacer} />
        </View>

        {isPreview && previewUri && !momentFillCutout ? (
          <View
            ref={publishCaptureRef}
            collapsable={false}
            style={styles.publishCapture}
            pointerEvents="none"
          >
            <MomentMediaCanvas
              uri={previewUri}
              fillCutout={false}
              knownImageSize={momentSourceSize}
              style={{ width: MOMENT_PUBLISH_WIDTH, height: MOMENT_PUBLISH_HEIGHT }}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.bottomDock,
            styles.bottomDockMoment,
            isPreview && styles.bottomDockPreview,
            { paddingBottom: insets.bottom + 2 },
          ]}
          pointerEvents="box-none"
        >
          {isPreview ? (
            <MomentEditorRail
              builtinStickers={builtinStickers}
              deviceStickers={deviceStickers}
              stickersLoading={stickersLoading}
              overlays={overlays}
              activeOverlayId={activeOverlayId}
              onAddSticker={addStickerOverlay}
              onAddEmoji={addEmojiOverlay}
              onAddText={addTextOverlay}
              onUpdateText={updateTextOverlay}
              onSelectOverlay={setActiveOverlayId}
              onEnsureStickerUri={ensureStickerUri}
              onRefreshDeviceStickers={refreshDeviceStickers}
              onImportFromIMessage={importFromIMessage}
              importingFromIMessage={importingStickers}
              publishing={uploading}
              onPublish={() => void post()}
            />
          ) : null}

          <ComposerBottomModeMenu
            mode={mode}
            switchEnabled={modeSwitchEnabled}
            onModeChange={handleModeChange}
            disabled={uploading || picking}
          />
        </View>

        {uploading ? (
          <View style={styles.postingOverlay} pointerEvents="none">
            <Text style={styles.postingText}>{copy.publishing}</Text>
          </View>
        ) : null}

        {screenFlashActive ? <View style={styles.screenFlash} pointerEvents="none" /> : null}
      </View>
    </ModalGestureRoot>
  );
}

const styles = StyleSheet.create({
  rootMoment: {
    flex: 1,
    backgroundColor: "#000",
  },
  momentCutout: {
    flex: 1,
  },
  frameHost: {
    position: "absolute",
    zIndex: 10,
  },
  captureOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  publishCapture: {
    position: "absolute",
    left: -9999,
    top: 0,
    width: MOMENT_PUBLISH_WIDTH,
    height: MOMENT_PUBLISH_HEIGHT,
    opacity: 0,
    zIndex: 1,
  },
  cameraPlaceholder: {
    backgroundColor: "#000",
  },
  unavailableStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#000",
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  unavailableBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textWhite55,
    textAlign: "center",
  },
  unavailableLibraryBtn: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  unavailableLibraryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    minHeight: composerChrome.topBarHeight,
  },
  igIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  igIconBtnDisabled: {
    opacity: 0.35,
  },
  topBarSpacer: {
    width: 44,
  },
  screenFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    zIndex: 200,
  },
  bottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    gap: composerChrome.modeMenuGap,
  },
  bottomDockMoment: {
    backgroundColor: "#000",
  },
  bottomDockPreview: {
    gap: 4,
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: composerChrome.captureRowHeight,
    paddingHorizontal: 28,
    gap: 36,
  },
  galleryBtn: {
    width: composerChrome.gallerySize,
    height: composerChrome.gallerySize,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(30,30,30,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtn: {
    width: composerChrome.flipSize,
    height: composerChrome.flipSize,
    borderRadius: composerChrome.flipSize / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtnDisabled: {
    opacity: 0.35,
  },
  shutterOuter: {
    width: composerChrome.shutterOuter,
    height: composerChrome.shutterOuter,
    borderRadius: composerChrome.shutterOuter / 2,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: composerChrome.shutterInner,
    height: composerChrome.shutterInner,
    borderRadius: composerChrome.shutterInner / 2,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  postingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  postingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
