import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, RotateCcw, X, Zap, ZapOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  momentStageMetrics,
} from "../../theme/momentStageLayout";
import { colors } from "../../theme/colors";
import { mediaLayout } from "../../theme/mediaLayout";
import { ModalGestureRoot } from "../ModalGestureRoot";
import { ComposerBottomModeMenu } from "./ComposerBottomModeMenu";
import { ComposerViewportFrame } from "./ComposerViewportFrame";
import {
  MomentMediaCanvas,
  type MomentMediaCanvasHandle,
} from "../moments/MomentMediaCanvas";
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
  const capturingRef = useRef(false);
  const momentCropRef = useRef<MomentMediaCanvasHandle>(null);
  const previewUriRef = useRef<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [surface, setSurface] = useState<StoryCameraSurface>("live");
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [shareAspect, setShareAspect] = useState<ShareAspectFormat>("portrait");
  const [picking, setPicking] = useState(false);
  const [posting, setPosting] = useState(false);
  const [momentFillCutout, setMomentFillCutout] = useState(true);
  const [momentPreviewSize, setMomentPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [momentSourceSize, setMomentSourceSize] = useState<{ width: number; height: number } | null>(null);
  const [shareActiveUri, setShareActiveUri] = useState<string | null>(null);
  const [screenFlashActive, setScreenFlashActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const previewLift = useRef(new Animated.Value(0)).current;
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
      previewLift.setValue(0);
      void Image.prefetch(uri);

      if (size) return;

      void loadMomentImageLayout(uri).then((refined) => {
        if (!refined || previewUriRef.current !== uri) return;
        setMomentFillCutout(refined.fillCutout);
        setMomentSourceSize({ width: refined.width, height: refined.height });
      });
    },
    [momentStage.width, momentStage.height, previewLift]
  );

  const resetSession = useCallback(() => {
    setPreviewUri(null);
    setShareAspect("portrait");
    setFacing("back");
    setFlashOn(false);
    setPicking(false);
    setPosting(false);
    setMomentFillCutout(true);
    setMomentPreviewSize(null);
    setMomentSourceSize(null);
    setShareActiveUri(null);
    setSurface(mode === "shares" ? "share-library" : "live");
    setCameraReady(false);
    setScreenFlashActive(false);
    previewLift.setValue(0);
    setCapturing(false);
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
    setCameraReady(false);
    setFacing((f) => (f === "back" ? "front" : "back"));
  }

  useEffect(() => {
    if (!showLiveCamera) {
      setCameraReady(false);
      return;
    }
    setCameraReady(false);
    const fallback = setTimeout(() => setCameraReady(true), 80);
    return () => clearTimeout(fallback);
  }, [showLiveCamera, facing]);

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  async function pickLibrary() {
    if (picking || posting) return;
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
    if (surface !== "live" || posting || capturingRef.current) return;
    const camera = cameraRef.current;
    if (!camera) return;

    capturingRef.current = true;
    setCapturing(true);

    if (facing === "front" && flashOn) {
      setScreenFlashActive(true);
      setTimeout(() => setScreenFlashActive(false), SELFIE_SCREEN_FLASH_MS);
    }

    let delivered = false;
    const deliverPhoto = (photo: CameraCapturedPicture | null | undefined) => {
      if (delivered || !photo?.uri) return;
      delivered = true;
      showMomentPreview(photo.uri, photo.width, photo.height);
    };

    try {
      await new Promise<void>((resolve, reject) => {
        void camera
          .takePictureAsync({
            quality: mediaLayout.ingest.jpegQuality,
            skipProcessing: true,
            shutterSound: false,
            fastMode: true,
            onPictureSaved: (photo) => {
              deliverPhoto(photo);
              resolve();
            },
          })
          .then((result) => {
            if (result && typeof result === "object" && "uri" in result) {
              deliverPhoto(result);
            }
            resolve();
          })
          .catch(reject);
      });
    } catch {
      Alert.alert("Camera", copy.cameraStartFailed);
    } finally {
      capturingRef.current = false;
      setCapturing(false);
      setScreenFlashActive(false);
    }
  }

  function retake() {
    setPreviewUri(null);
    setMomentFillCutout(true);
    setMomentPreviewSize(null);
    setMomentSourceSize(null);
    setSurface(permission?.granted ? "live" : "unavailable");
  }

  function handleTopClose() {
    if (isPreview) {
      retake();
      return;
    }
    close();
  }

  function handleModeChange(next: ComposerMode) {
    if (next === mode || posting || picking) return;
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
    if (posting) return;
    setShareAspect(format);
    await publishInBackground(croppedUri, format);
  }

  async function resolveUploadUri(): Promise<string | null> {
    if (!previewUri) return null;
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
    if (!previewUri || posting) return;
    setPosting(true);
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
      setPosting(false);
    }
  }

  function close() {
    if (picking) return;
    resetSession();
    onClose();
  }

  if (!visible) return null;

  const libraryBottomInset =
    insets.bottom + composerChrome.modeMenuHeight + composerChrome.modeMenuGap + 8;

  const modalProps = {
    visible: true as const,
    animationType: "slide" as const,
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
              disabled={posting || picking}
            />
          </View>
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
              <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: previewLift }] }]}>
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
              </Animated.View>
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
                  disabled={picking}
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
                  disabled={posting || capturing || surface !== "live"}
                  style={[
                    styles.shutterOuter,
                    (surface !== "live" || capturing) && styles.shutterDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Capture photo"
                >
                  <View style={styles.shutterInner} />
                </Pressable>

                <Pressable
                  onPress={flipCamera}
                  disabled={surface !== "live" || posting}
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
          <IgIconButton onPress={handleTopClose} label={isPreview ? "Retake" : "Close"}>
            <X size={26} color="#fff" strokeWidth={2} />
          </IgIconButton>
          {isPreview ? (
            <>
              <View style={styles.topBarSpacer} />
              <Pressable
                onPress={() => void post()}
                disabled={posting}
                style={[styles.postTopBtn, posting && styles.postTopBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={mediaLexicon.publish.post}
              >
                <Text style={styles.postTopLabel}>{mediaLexicon.publish.post}</Text>
              </Pressable>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        {!isPreview ? (
          <View
            style={[styles.bottomDock, styles.bottomDockMoment, { paddingBottom: insets.bottom + 4 }]}
            pointerEvents="box-none"
          >
            <ComposerBottomModeMenu
              mode={mode}
              switchEnabled={modeSwitchEnabled}
              onModeChange={handleModeChange}
              disabled={posting || picking}
            />
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
    flex: 1,
  },
  postTopBtn: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  postTopBtnDisabled: {
    opacity: 0.45,
  },
  postTopLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
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
});
