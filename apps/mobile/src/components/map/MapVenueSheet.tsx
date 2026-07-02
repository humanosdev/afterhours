import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Navigation } from "lucide-react-native";
import { Dimensions, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  runOnUI,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ProfileAvatar } from "../ProfileAvatar";
import { RemoteImage } from "../media/RemoteImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { venueSheetHeatBorderColor } from "../../lib/mapCheckpointHeat";
import {
  localHourIsMapDaytime,
  mapChromeForMode,
  type MapChromeTokens,
} from "../../theme/mapDayChrome";
import { resolveVenueContextLine } from "../../lib/venueContextCopy";
import { formatVenueCategoryLabel } from "../../lib/venueDisplay";
import { colors } from "../../theme/colors";
import type { VenuePresenceSheetStats, VenueSheetPeople, VenueSheetPerson } from "../../lib/venuePresenceStats";
import type { VenuePublic } from "../../types/venue";
import { venueDisplayImageUrl } from "../../types/venue";
import { layout } from "../../theme/layout";
import { motion } from "../../theme/motion";
import { AtVenueIndicator } from "../presence/AtVenueIndicator";

const SHEET_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const DISMISS_VELOCITY = 520;
const DISMISS_COMMIT_RATIO = 0.16;

type MapVenueSheetProps = {
  visible: boolean;
  venue: VenuePublic;
  onClosed: () => void;
  presenceStats?: VenuePresenceSheetStats;
  venuePeople?: VenueSheetPeople;
  onFocusFriend?: (friendId: string) => void;
  onInteraction?: () => void;
  youAreHere?: boolean;
  youAreHereLive?: boolean;
  /** EVOLVE-3 — inner_pending before confirmed. */
  youAreHereSettling?: boolean;
};

function openDirections(venue: VenuePublic) {
  if (venue.lat == null || venue.lng == null) return;
  const destination = `${venue.lat},${venue.lng}`;
  const href =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  void Linking.openURL(href);
}

const SHEET_MAX_H = Math.min(Dimensions.get("window").height * 0.74, 760);

function timingMsForDistance(distance: number, total: number, baseMs: number) {
  "worklet";
  if (total <= 0) return baseMs;
  return Math.max(100, Math.round((distance / total) * baseMs));
}

function VenueFriendChip({
  person,
  dayMode,
  styles,
  onPress,
}: {
  person: VenueSheetPerson;
  dayMode: boolean;
  styles: ReturnType<typeof createVenueSheetStyles>;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.friendChip, dayMode ? styles.friendChipDay : styles.friendChipNight]}
      accessibilityRole="button"
      accessibilityLabel={`Focus ${person.label} on map`}
    >
      <ProfileAvatar avatarUrl={person.avatarUrl} label={person.label} size={32} bordered={false} />
      <Text style={styles.friendChipLabel} numberOfLines={1}>
        {person.label}
      </Text>
      {person.isRecentPresence ? <View style={styles.recentDot} /> : null}
    </Pressable>
  );
}

type MapVenueSheetBodyProps = {
  venue: VenuePublic;
  dayMode: boolean;
  chrome: ReturnType<typeof mapChromeForMode>;
  styles: ReturnType<typeof createVenueSheetStyles>;
  heroUrl: string | null;
  contextLine: string | null;
  presenceStats?: VenuePresenceSheetStats;
  venuePeople?: VenueSheetPeople;
  youAreHere: boolean;
  youAreHereLive: boolean;
  youAreHereSettling: boolean;
  onFocusFriend?: (friendId: string) => void;
  onInteraction?: () => void;
};

const MapVenueSheetBody = memo(function MapVenueSheetBody({
  venue,
  dayMode,
  chrome,
  styles,
  heroUrl,
  contextLine,
  presenceStats,
  venuePeople,
  youAreHere,
  youAreHereLive,
  youAreHereSettling,
  onFocusFriend,
  onInteraction,
}: MapVenueSheetBodyProps) {
  return (
    <>
      {heroUrl ? (
        <View style={styles.heroWrap}>
          <RemoteImage uri={heroUrl} layoutClass="VENUE_HERO" contentFit="cover" accessibilityLabel={venue.name} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={styles.heroScrim} pointerEvents="none" />
          {youAreHere ? (
            <View style={styles.hereBadge} pointerEvents="none">
              <AtVenueIndicator
                venueName={venue.name}
                variant="sheet"
                live={youAreHereLive}
                settling={youAreHereSettling}
              />
            </View>
          ) : null}
        </View>
      ) : youAreHere ? (
        <View style={styles.hereBadgeInline} pointerEvents="none">
          <AtVenueIndicator
            venueName={venue.name}
            variant="sheet"
            live={youAreHereLive}
            settling={youAreHereSettling}
          />
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={2}>
            {venue.name}
          </Text>
          <Text style={styles.meta}>
            {formatVenueCategoryLabel(venue.category)}
            {presenceStats && presenceStats.insideFriends + presenceStats.nearbyFriends > 0
              ? " · Friends live at this pin"
              : presenceStats && presenceStats.insideTotal + presenceStats.nearbyTotal > 0
                ? " · Live crowd in the radius"
                : " · Crowd counts update as friends go live"}
          </Text>
          {contextLine ? <Text style={styles.contextLine}>{contextLine}</Text> : null}
        </View>
        <View style={styles.actionCol}>
          <Pressable onPress={() => openDirections(venue)} accessibilityRole="button" accessibilityLabel="Open directions">
            <View style={styles.roundActionInner}>
              <Navigation size={17} color={chrome.ink90} strokeWidth={2.1} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.densityStrip}>
        <View style={styles.densityHalf}>
          <Text style={styles.densityLabel}>INSIDE</Text>
          <Text style={styles.densityValue}>
            {presenceStats ? String(presenceStats.insideTotal) : "—"}
          </Text>
          <Text style={styles.densitySub}>
            {presenceStats && presenceStats.insideFriends > 0
              ? `${presenceStats.insideFriends} friend${presenceStats.insideFriends === 1 ? "" : "s"}`
              : "Anyone live inside"}
          </Text>
        </View>
        <View style={styles.densityDivider} />
        <View style={styles.densityHalf}>
          <Text style={styles.densityLabel}>NEARBY</Text>
          <Text style={styles.densityValue}>
            {presenceStats ? String(presenceStats.nearbyTotal) : "—"}
          </Text>
          <Text style={styles.densitySub}>
            {presenceStats && presenceStats.nearbyFriends > 0
              ? `${presenceStats.nearbyFriends} friend${presenceStats.nearbyFriends === 1 ? "" : "s"}`
              : "Anyone live nearby"}
          </Text>
        </View>
      </View>

      <View style={styles.friendsBlock}>
        {venuePeople && venuePeople.insideFriends.length > 0 ? (
          <>
            <Text style={styles.friendsSectionLabel}>FRIENDS CHECKED IN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
              {venuePeople.insideFriends.map((f) => (
                <VenueFriendChip
                  key={f.userId}
                  person={f}
                  dayMode={dayMode}
                  styles={styles}
                  onPress={() => {
                    onInteraction?.();
                    onFocusFriend?.(f.userId);
                  }}
                />
              ))}
            </ScrollView>
          </>
        ) : venuePeople && venuePeople.insideAllCount > 0 ? (
          <Text style={styles.quietCopy}>
            {venuePeople.insideAllCount} people in this pin—none on your friends list yet.
          </Text>
        ) : (
          <Text style={styles.quietCopy}>Quiet pin for now. When the night spikes, faces stack here first.</Text>
        )}

        {venuePeople && venuePeople.nearbyFriends.length > 0 ? (
          <>
            <Text style={[styles.friendsSectionLabel, { marginTop: 14 }]}>FRIENDS IN THE RADIUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRow}>
              {venuePeople.nearbyFriends.map((f) => (
                <VenueFriendChip
                  key={`near-${f.userId}`}
                  person={f}
                  dayMode={dayMode}
                  styles={styles}
                  onPress={() => {
                    onInteraction?.();
                    onFocusFriend?.(f.userId);
                  }}
                />
              ))}
            </ScrollView>
          </>
        ) : venuePeople &&
          venuePeople.insideFriends.length === 0 &&
          venuePeople.nearbyAllCount > 0 &&
          venuePeople.nearbyFriends.length === 0 ? (
          <Text style={[styles.quietCopy, { marginTop: 10 }]}>
            {venuePeople.nearbyAllCount} people in range—none on your list yet.
          </Text>
        ) : venuePeople && venuePeople.insideFriends.length > 0 && venuePeople.nearbyFriends.length === 0 ? (
          <Text style={[styles.quietCopy, { marginTop: 10 }]}>
            Outer ring is clear of your friends—slide the map or grab another pin.
          </Text>
        ) : null}
      </View>
    </>
  );
});

function MapVenueSheetInner({
  visible,
  venue,
  onClosed,
  presenceStats,
  venuePeople,
  onFocusFriend,
  onInteraction,
  youAreHere = false,
  youAreHereLive = true,
  youAreHereSettling = false,
}: MapVenueSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10) + 12;
  const heroUrl = venueDisplayImageUrl(venue);
  const contextLine = useMemo(() => resolveVenueContextLine(new Date(), venue.context_copy), [venue.context_copy]);
  const dayMode = localHourIsMapDaytime();
  const chrome = mapChromeForMode(dayMode);
  const styles = useMemo(() => createVenueSheetStyles(chrome, dayMode), [dayMode]);
  const sheetActivity = presenceStats
    ? presenceStats.insideTotal + presenceStats.nearbyTotal
    : 0;
  const heatBorder = venueSheetHeatBorderColor(sheetActivity, dayMode);

  const onClosedRef = useRef(onClosed);
  const onInteractionRef = useRef(onInteraction);
  onClosedRef.current = onClosed;
  onInteractionRef.current = onInteraction;

  const sheetHSv = useSharedValue(SHEET_MAX_H);
  const translateY = useSharedValue(SHEET_MAX_H);
  const backdropOpacity = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const closingSv = useSharedValue(0);

  sheetHSv.value = SHEET_MAX_H;

  const scrollGesture = useMemo(() => Gesture.Native(), []);

  const finishDismiss = useCallback(() => {
    closingSv.value = 0;
    onInteractionRef.current?.();
    onClosedRef.current();
  }, [closingSv]);

  const sheetMotionWorklets = useMemo(() => {
    const animateClose = () => {
      "worklet";
      if (closingSv.value === 1) return;
      closingSv.value = 1;
      const currentY = Math.max(0, translateY.value);
      const remaining = Math.max(0, sheetHSv.value - currentY);
      const duration = timingMsForDistance(remaining, sheetHSv.value, motion.sheet.closeSheet);
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = withTiming(
        sheetHSv.value,
        { duration, easing: SHEET_EASE },
        (finished) => {
          if (finished) runOnJS(finishDismiss)();
        }
      );
      backdropOpacity.value = withTiming(0, {
        duration: timingMsForDistance(remaining, sheetHSv.value, motion.sheet.closeBackdrop),
        easing: SHEET_EASE,
      });
    };

    const animateOpen = () => {
      "worklet";
      closingSv.value = 0;
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = SHEET_MAX_H;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, { duration: motion.sheet.openSheet, easing: SHEET_EASE });
      backdropOpacity.value = withTiming(1, { duration: motion.sheet.openBackdrop, easing: SHEET_EASE });
    };

    const animateSnapOpen = () => {
      "worklet";
      const currentY = Math.max(0, translateY.value);
      const duration = timingMsForDistance(currentY, sheetHSv.value, motion.sheet.openSheet);
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      translateY.value = withTiming(0, { duration, easing: SHEET_EASE });
      backdropOpacity.value = withTiming(1, {
        duration: timingMsForDistance(currentY, sheetHSv.value, motion.sheet.openBackdrop),
        easing: SHEET_EASE,
      });
    };

    const settleFromPosition = (velocityY: number) => {
      "worklet";
      const currentY = Math.max(0, translateY.value);
      const commitY = Math.max(40, sheetHSv.value * DISMISS_COMMIT_RATIO);
      const shouldClose = currentY >= commitY || velocityY > DISMISS_VELOCITY;
      if (shouldClose) {
        animateClose();
        return;
      }
      animateSnapOpen();
    };

    return { animateClose, animateOpen, settleFromPosition };
  }, [backdropOpacity, closingSv, finishDismiss, sheetHSv, translateY]);

  const requestDismiss = useCallback(() => {
    runOnUI(sheetMotionWorklets.animateClose)();
  }, [sheetMotionWorklets]);

  useEffect(() => {
    if (visible) {
      runOnUI(sheetMotionWorklets.animateOpen)();
      return;
    }
    runOnUI(sheetMotionWorklets.animateClose)();
  }, [visible, venue.id, sheetMotionWorklets]);

  const sheetPanGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetY(6)
      .failOffsetY(-8)
      .failOffsetX([-24, 24])
      .simultaneousWithExternalGesture(scrollGesture)
      .onBegin(() => {
        dragStartY.value = translateY.value;
        cancelAnimation(translateY);
        cancelAnimation(backdropOpacity);
      })
      .onUpdate((e) => {
        if (scrollOffset.value > 1) return;
        const nextY = Math.max(0, dragStartY.value + e.translationY);
        translateY.value = nextY;
        const progress = Math.min(1, nextY / (sheetHSv.value * 0.92));
        backdropOpacity.value = 1 - progress * 0.5;
      })
      .onEnd((e) => {
        sheetMotionWorklets.settleFromPosition(e.velocityY);
      });
  }, [backdropOpacity, dragStartY, sheetMotionWorklets, scrollGesture, scrollOffset, sheetHSv, translateY]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const sheetMotionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropMotionStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetChromeStyle = useMemo(
    () => ({
      paddingBottom: bottomPad,
      maxHeight: SHEET_MAX_H,
      borderTopColor: dayMode ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.04)",
      borderColor: heatBorder,
    }),
    [bottomPad, dayMode, heatBorder]
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropMotionStyle]} pointerEvents="none" />
      <Pressable
        style={styles.backdropTap}
        onPress={requestDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss venue sheet"
      />

      <Animated.View style={[styles.sheet, sheetMotionStyle, sheetChromeStyle]} collapsable={false}>
        <LinearGradient
          colors={[chrome.sheetBgTop, chrome.sheetBgBottom]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <GestureDetector gesture={sheetPanGesture}>
          <View style={styles.dragZone}>
            <View style={styles.handleRow} accessibilityLabel="Swipe down to close">
              <View style={styles.handle} accessibilityElementsHidden />
            </View>
          </View>
        </GestureDetector>

        <GestureDetector gesture={scrollGesture}>
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            bounces
            alwaysBounceVertical={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            <MapVenueSheetBody
              venue={venue}
              dayMode={dayMode}
              chrome={chrome}
              styles={styles}
              heroUrl={heroUrl}
              contextLine={contextLine}
              presenceStats={presenceStats}
              venuePeople={venuePeople}
              youAreHere={youAreHere}
              youAreHereLive={youAreHereLive}
              youAreHereSettling={youAreHereSettling}
              onFocusFriend={onFocusFriend}
              onInteraction={onInteraction}
            />
          </Animated.ScrollView>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

export const MapVenueSheet = memo(MapVenueSheetInner);

function createVenueSheetStyles(chrome: MapChromeTokens, dayMode: boolean) {
  return StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 320,
    backgroundColor: chrome.sheetBg,
  },
  dragZone: {
    zIndex: 2,
  },
  handleRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 32,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: chrome.sheetHandle,
  },
  scroll: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: 16,
    zIndex: 2,
  },
  heroWrap: {
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  hereBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    zIndex: 3,
  },
  hereBadgeInline: {
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: chrome.ink,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: chrome.muted,
  },
  contextLine: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    color: chrome.caption,
  },
  actionCol: {
    flexDirection: "row",
    gap: 6,
  },
  roundActionInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: chrome.panelBorder,
    backgroundColor: chrome.panelBg,
  },
  densityStrip: {
    flexDirection: "row",
    borderRadius: layout.cardRadius,
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: chrome.panelBorder,
    backgroundColor: chrome.panelBgSoft,
  },
  densityHalf: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  densityDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: dayMode ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.09)",
    marginVertical: 2,
  },
  densityLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: chrome.labelUpper,
  },
  densityValue: {
    fontSize: 26,
    fontWeight: "700",
    color: chrome.ink,
    fontVariant: ["tabular-nums"],
  },
  densitySub: {
    fontSize: 11,
    fontWeight: "500",
    color: chrome.muted2,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  friendsBlock: {
    borderRadius: layout.cardRadius,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: chrome.panelBorder,
    backgroundColor: chrome.panelBgSoft,
  },
  friendsSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: dayMode ? "#7a8698" : "rgba(255,255,255,0.42)",
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
  },
  friendChipDay: {
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  friendChipNight: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  friendChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: dayMode ? "#0f172a" : "rgba(255,255,255,0.88)",
    flexShrink: 1,
    maxWidth: 120,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentActive,
  },
  quietCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: chrome.caption,
  },
  });
}
