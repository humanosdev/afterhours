import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StoryComposerModal } from "../components/create/StoryComposerModal";
import { ShareCommentsBottomSheet } from "../components/shares/ShareCommentsBottomSheet";
import { StoryViewerModal } from "../components/stories/StoryViewerModal";
import type { ComposerMode } from "../lib/uploadStoryMediaTypes";
import { emitStoryPosted } from "../lib/storyPostEvents";
import { emitStoryPostStarted, type StoryPostStartPayload } from "../lib/storyPostOptimistic";
import { patchShareStatsCommentsDelta } from "../lib/shareStatsCache";
import { warmStoryViewerDeckAsync } from "../lib/warmStoryViewerDeck";
import type { StoryViewerGroup } from "../lib/storyViewerTypes";

export type CreateComposerMode = "both" | "shares_only";
export type CreateComposerTab = "moments" | "shares";

export type StoryViewerReviewMode = "expired-archive";

export type OpenStoryViewerOptions = {
  /** Slide index within the tapped user's group (defaults to 0). */
  storyIndex?: number;
  /** Ordered queue for horizontal ring-to-ring progression (hub rail). */
  queue?: StoryViewerGroup[];
  /** Manual IG cutout review — profile expired moments (no auto-advance / social footer). */
  reviewMode?: StoryViewerReviewMode;
};

export type ShareCommentsChangedHandler = (storyId: string, delta: number) => void;

export type OpenShareCommentsOptions = {
  onCommentsChanged?: ShareCommentsChangedHandler;
};

type CreateComposerContextValue = {
  overlayOpen: boolean;
  shareCommentsStoryId: string | null;
  openCreateComposer: (opts?: { mode?: CreateComposerMode; tab?: CreateComposerTab }) => void;
  openStoryComposer: (mode: ComposerMode, opts?: { allowModeSwitch?: boolean }) => void;
  openStoryViewer: (group: StoryViewerGroup, options?: OpenStoryViewerOptions | number) => void;
  openShareComments: (storyId: string, opts?: OpenShareCommentsOptions) => void;
  closeShareComments: () => void;
  closeOverlays: () => void;
  bumpStoryEpoch: () => void;
  storyEpoch: number;
};

const CreateComposerContext = createContext<CreateComposerContextValue | null>(null);

export function useCreateComposer(): CreateComposerContextValue {
  const ctx = useContext(CreateComposerContext);
  if (!ctx) throw new Error("useCreateComposer must be used within CreateComposerProvider");
  return ctx;
}

export function useCreateComposerOptional(): CreateComposerContextValue | null {
  return useContext(CreateComposerContext);
}

export function CreateComposerProvider({ children }: { children: ReactNode }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("moments");
  const [composerModeSwitchEnabled, setComposerModeSwitchEnabled] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState<StoryViewerGroup[]>([]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0);
  const [viewerReviewMode, setViewerReviewMode] = useState<StoryViewerReviewMode | null>(null);
  const [storyEpoch, setStoryEpoch] = useState(0);
  const [shareCommentsStoryId, setShareCommentsStoryId] = useState<string | null>(null);
  const shareCommentsHandlerRef = useRef<ShareCommentsChangedHandler | null>(null);

  const overlayOpen = composerOpen || viewerOpen || shareCommentsStoryId != null;

  const closeShareComments = useCallback(() => {
    setShareCommentsStoryId(null);
  }, []);

  const openShareComments = useCallback((storyId: string, opts?: OpenShareCommentsOptions) => {
    shareCommentsHandlerRef.current = opts?.onCommentsChanged ?? null;
    setShareCommentsStoryId(storyId);
  }, []);

  const handleShareCommentsChanged = useCallback((storyId: string, delta: number) => {
    patchShareStatsCommentsDelta(storyId, delta);
    shareCommentsHandlerRef.current?.(storyId, delta);
  }, []);

  const closeOverlays = useCallback(() => {
    setComposerOpen(false);
    setViewerOpen(false);
    setViewerGroups([]);
    setShareCommentsStoryId(null);
  }, []);

  /**
   * Opens full-screen camera immediately (VP-2 / MEDIA).
   * PWA uses a brief create sheet first; native skips sheet to avoid frozen-underlay UX
   * and matches IG/Snap open-camera intent. Same moment vs share semantics via in-camera rail.
   */
  const openCreateComposer = useCallback(
    (opts?: { mode?: CreateComposerMode; tab?: CreateComposerTab }) => {
      const sheetMode = opts?.mode ?? "both";
      const tab = opts?.tab ?? "moments";
      setComposerModeSwitchEnabled(sheetMode === "both");
      setComposerMode(sheetMode === "shares_only" ? "shares" : tab);
      setComposerOpen(true);
    },
    []
  );

  const openStoryComposer = useCallback((mode: ComposerMode, opts?: { allowModeSwitch?: boolean }) => {
    setComposerModeSwitchEnabled(opts?.allowModeSwitch ?? false);
    setComposerMode(mode);
    setComposerOpen(true);
  }, []);

  const openStoryViewer = useCallback((group: StoryViewerGroup, optionsOrIndex?: OpenStoryViewerOptions | number) => {
    const options =
      typeof optionsOrIndex === "number" ? { storyIndex: optionsOrIndex } : optionsOrIndex;
    const queue = (options?.queue?.length ? options.queue : [group]).filter(
      (g) => g.stories.length > 0
    );
    if (!group.stories.length && !queue.length) return;
    const resolvedQueue = queue.length > 0 ? queue : [group];
    const groupIndex = Math.max(
      0,
      resolvedQueue.findIndex((g) => g.user_id === group.user_id)
    );
    const stories = resolvedQueue[groupIndex]?.stories ?? group.stories;
    if (!stories.length) return;
    const maxStory = Math.max(0, stories.length - 1);
    const storyIndex = Math.min(Math.max(0, options?.storyIndex ?? 0), maxStory);

    for (const g of resolvedQueue) {
      warmStoryViewerDeckAsync(g.stories);
    }

    setViewerReviewMode(options?.reviewMode ?? null);
    setViewerGroups(resolvedQueue);
    setViewerGroupIndex(groupIndex);
    setViewerStoryIndex(storyIndex);
    setViewerOpen(true);
  }, []);

  /** PWA `story-posted` — refetch hub rail, feed, profile grids, rings (local only). */
  const bumpStoryEpoch = useCallback(() => {
    setStoryEpoch((n) => n + 1);
    emitStoryPosted();
  }, []);

  const value = useMemo(
    () => ({
      overlayOpen,
      shareCommentsStoryId,
      openCreateComposer,
      openStoryComposer,
      openStoryViewer,
      openShareComments,
      closeShareComments,
      closeOverlays,
      bumpStoryEpoch,
      storyEpoch,
    }),
    [
      overlayOpen,
      shareCommentsStoryId,
      openCreateComposer,
      openStoryComposer,
      openStoryViewer,
      openShareComments,
      closeShareComments,
      closeOverlays,
      bumpStoryEpoch,
      storyEpoch,
    ]
  );

  return (
    <CreateComposerContext.Provider value={value}>
      {children}
      <StoryComposerModal
        visible={composerOpen}
        mode={composerMode}
        modeSwitchEnabled={composerModeSwitchEnabled}
        onModeChange={setComposerMode}
        onClose={() => setComposerOpen(false)}
        onPosted={(payload: StoryPostStartPayload) => {
          emitStoryPostStarted(payload);
          setComposerOpen(false);
        }}
      />
      <StoryViewerModal
        visible={viewerOpen}
        groups={viewerGroups}
        groupIndex={viewerGroupIndex}
        storyIndex={viewerStoryIndex}
        reviewMode={viewerReviewMode}
        onGroupIndexChange={setViewerGroupIndex}
        onStoryIndexChange={setViewerStoryIndex}
        onClose={() => {
          setViewerOpen(false);
          setViewerGroups([]);
          setViewerReviewMode(null);
        }}
        onStoryDeleted={() => bumpStoryEpoch()}
      />
      <ShareCommentsBottomSheet
        storyId={shareCommentsStoryId}
        onClose={closeShareComments}
        onCommentsChanged={handleShareCommentsChanged}
      />
    </CreateComposerContext.Provider>
  );
}
