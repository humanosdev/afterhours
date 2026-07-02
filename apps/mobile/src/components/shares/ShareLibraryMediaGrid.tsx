import * as MediaLibrary from "expo-media-library";
import { Image } from "expo-image";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { ShareLibraryGridSkeleton } from "../skeletons/ShareComposerSkeleton";
import { CrossfadeBand } from "../ui/CrossfadeBand";
import { Skeleton } from "../ui/Skeleton";
import { useMinimumSkeleton, SKELETON_SECTION_MIN_DISPLAY_MS } from "../../hooks/useMinimumSkeleton";
import { prefetchStoryMediaUri } from "../../lib/prefetchStoryMedia";

const PAGE_SIZE = 48;
const MAX_SELECT = 10;
const COLS = 4;
const GAP = 1;

type GridAsset = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

export type ShareLibraryMediaGridHandle = {
  scrollToTop: (animated?: boolean) => void;
};

type ShareLibraryMediaGridProps = {
  selectedUris: string[];
  onSelectionChange: (uris: string[]) => void;
  bottomInset: number;
  activeUri?: string | null;
  onActiveUriChange?: (uri: string, size?: { width: number; height: number }) => void;
  singleSelect?: boolean;
  listHeader?: ReactElement | null;
  headerScrollHeight?: number;
  onExpandPreview?: () => void;
  scrollEnabled?: boolean;
};

type GridCellProps = {
  uri: string;
  cellSize: number;
  selected: boolean;
  isActive: boolean;
  order: number;
  singleSelect: boolean;
  onPress: (uri: string) => void;
  onPressIn: (uri: string) => void;
};

const ShareGridCell = memo(function ShareGridCell({
  uri,
  cellSize,
  selected,
  isActive,
  order,
  singleSelect,
  onPress,
  onPressIn,
}: GridCellProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [uri]);

  return (
    <Pressable
      onPress={() => onPress(uri)}
      onPressIn={() => onPressIn(uri)}
      style={[{ width: cellSize, height: cellSize }, isActive && styles.activeCell]}
      accessibilityRole="button"
      accessibilityState={{ selected: selected || isActive }}
    >
      <CrossfadeBand
        loading={!ready}
        skeleton={<Skeleton style={StyleSheet.absoluteFillObject} borderRadius={0} />}
        style={styles.thumbWrap}
        variant="micro"
      >
        <Image
          source={{ uri }}
          style={styles.thumb}
          contentFit="cover"
          recyclingKey={uri}
          transition={0}
          cachePolicy="memory-disk"
          onLoad={() => setReady(true)}
        />
      </CrossfadeBand>
      {selected && !singleSelect ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>{order + 1}</Text>
        </View>
      ) : isActive ? (
        <View style={styles.activeRing} />
      ) : (
        <View style={styles.unselectedRing} />
      )}
    </Pressable>
  );
});

/** In-app photo grid — preview scrolls away with the list header (IG). */
export const ShareLibraryMediaGrid = forwardRef(function ShareLibraryMediaGrid(
  {
    selectedUris,
    onSelectionChange,
    bottomInset,
    activeUri = null,
    onActiveUriChange,
    singleSelect = false,
    listHeader = null,
    headerScrollHeight = 0,
    onExpandPreview,
    scrollEnabled = true,
  }: ShareLibraryMediaGridProps,
  ref: Ref<ShareLibraryMediaGridHandle>
) {
  const { width } = useWindowDimensions();
  const cellSize = (width - GAP * (COLS - 1)) / COLS;
  const rowStride = cellSize + GAP;
  const listRef = useRef<FlatList<GridAsset>>(null);

  useImperativeHandle(ref, () => ({
    scrollToTop: (animated = true) => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    },
  }));

  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<GridAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNext, setHasNext] = useState(true);

  const loadPage = useCallback(async (after?: string) => {
    const result = await MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      after,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    const mapped = result.assets
      .map((a) => ({
        id: a.id,
        uri: a.uri,
        width: a.width,
        height: a.height,
      }))
      .filter((a) => !!a.uri);

    setAssets((prev) => (after ? [...prev, ...mapped] : mapped));
    setEndCursor(result.endCursor);
    setHasNext(result.hasNextPage);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const perm = permission?.granted ? permission : await requestPermission();
      if (!perm.granted) {
        setLoading(false);
        return;
      }
      await loadPage();
      setLoading(false);
    })();
  }, [permission, requestPermission, loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingMore || !endCursor) return;
    setLoadingMore(true);
    try {
      await loadPage(endCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNext, loadingMore, endCursor, loadPage]);

  const getItemLayout = useCallback(
    (_: ArrayLike<GridAsset> | null | undefined, index: number) => ({
      length: rowStride,
      offset: headerScrollHeight + rowStride * Math.floor(index / COLS),
      index,
    }),
    [rowStride, headerScrollHeight]
  );

  const prefetchThumb = useCallback((uri: string) => {
    void prefetchStoryMediaUri(uri);
  }, []);

  const assetByUri = useMemo(() => {
    const map = new Map<string, { width: number; height: number }>();
    for (const asset of assets) {
      if (asset.width > 0 && asset.height > 0) {
        map.set(asset.uri, { width: asset.width, height: asset.height });
      }
    }
    return map;
  }, [assets]);

  const toggle = useCallback(
    (uri: string) => {
      if (singleSelect) {
        onActiveUriChange?.(uri, assetByUri.get(uri));
        onSelectionChange([uri]);
        onExpandPreview?.();
        return;
      }
      if (selectedUris.includes(uri)) {
        onSelectionChange(selectedUris.filter((u) => u !== uri));
        return;
      }
      if (selectedUris.length >= MAX_SELECT) return;
      onSelectionChange([...selectedUris, uri]);
    },
    [singleSelect, onActiveUriChange, onSelectionChange, onExpandPreview, selectedUris, assetByUri]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridAsset }) => {
      const idx = selectedUris.indexOf(item.uri);
      return (
        <ShareGridCell
          uri={item.uri}
          cellSize={cellSize}
          selected={idx >= 0}
          isActive={activeUri === item.uri}
          order={idx}
          singleSelect={singleSelect}
          onPress={toggle}
          onPressIn={prefetchThumb}
        />
      );
    },
    [activeUri, cellSize, selectedUris, singleSelect, toggle, prefetchThumb]
  );

  const gridLoading = loading && assets.length === 0;
  const showGridSkeleton = useMinimumSkeleton(gridLoading, SKELETON_SECTION_MIN_DISPLAY_MS);

  if (!permission?.granted && !loading) {
    return (
      <View style={styles.centered}>
        <Pressable onPress={() => void requestPermission()} style={styles.permissionBtn}>
          <ActivityIndicator color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      scrollEnabled={scrollEnabled}
      data={assets}
      keyExtractor={(item) => item.id}
      numColumns={COLS}
      ListHeaderComponent={listHeader ?? undefined}
      ListEmptyComponent={
        showGridSkeleton ? () => <ShareLibraryGridSkeleton rows={10} /> : null
      }
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP, paddingBottom: bottomInset + 16 }}
      scrollEventThrottle={16}
      removeClippedSubviews
      initialNumToRender={20}
      maxToRenderPerBatch={16}
      windowSize={9}
      getItemLayout={headerScrollHeight > 0 ? getItemLayout : undefined}
      renderItem={renderItem}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} /> : null
      }
    />
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionBtn: {
    padding: 16,
  },
  thumbWrap: {
    width: "100%",
    height: "100%",
  },
  thumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111",
  },
  activeCell: {
    opacity: 0.92,
  },
  activeRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#fff",
  },
  unselectedRing: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
});
