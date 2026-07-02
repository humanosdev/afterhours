import Svg, { Circle, Path } from "react-native-svg";
import type { VenueCategoryAccentKey } from "../../lib/venueCategoryAccent";
import { resolveVenueCategoryAccentKey, venueCategoryAccentHex } from "../../lib/venueCategoryAccent";

type MapCategoryGlyphProps = {
  categoryKey: VenueCategoryAccentKey;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** When false, events/all use fill-only glyphs like PWA canvas. */
  stroke?: boolean;
};

/** PWA filter tray `NightlifeDrinkIcon` — margarita + straw (not lucide Wine). */
export function NightlifeDrinkGlyph({
  size,
  color,
  strokeWidth,
}: {
  size: number;
  color: string;
  strokeWidth: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7.5H19L14.2 14H9.8L5 7.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 14V19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M8.5 19H15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M15.5 6L20 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** PWA `drawCampusCapGlyph`. */
function CampusCapGlyph({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 14.5 L12 6.5 L22 14.5 L12 18.5 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 17 V21.5 H18.5 V17"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** PWA `drawFoodCrossGlyph` — crossed utensils. */
function FoodCrossGlyph({ size, color, strokeWidth }: { size: number; color: string; strokeWidth: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20 L20 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M20 20 L4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M6.5 10.5 L8 9 M7.5 12.5 L9.5 10.5 M8.5 14.5 L10.5 12.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** PWA `drawCategoryGlyph` events star (filled). */
function EventsStarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2 L15.2 9.4 L23 10 L17 15.1 L18.4 23 L12 19.4 L5.6 23 L7 15.1 L1 10 L8.8 9.4 Z" />
    </Svg>
  );
}

/** PWA `drawCategoryGlyph` all — four dots. */
function AllGridGlyph({ size, color }: { size: number; color: string }) {
  const r = size * 0.09;
  const o = size * 0.23;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12 - o} cy={12 - o} r={r} />
      <Circle cx={12 + o} cy={12 - o} r={r} />
      <Circle cx={12 - o} cy={12 + o} r={r} />
      <Circle cx={12 + o} cy={12 + o} r={r} />
    </Svg>
  );
}

export function MapCategoryGlyph({
  categoryKey: keyIn,
  size = 11,
  color,
  strokeWidth = 2,
}: MapCategoryGlyphProps) {
  const key = keyIn;
  const fill = color ?? venueCategoryAccentHex(key);
  const sw = strokeWidth;

  switch (key) {
    case "nightlife":
      return <NightlifeDrinkGlyph size={size} color={fill} strokeWidth={sw} />;
    case "campus":
      return <CampusCapGlyph size={size} color={fill} strokeWidth={sw} />;
    case "food":
      return <FoodCrossGlyph size={size} color={fill} strokeWidth={sw} />;
    case "events":
      return <EventsStarGlyph size={size} color={fill} />;
    case "all":
    default:
      return <AllGridGlyph size={size} color={fill} />;
  }
}

/** Resolve accent key from venue fields — map markers. */
export function MapVenueCategoryGlyph({
  category,
  name,
  size = 22,
  selected = false,
}: {
  category: string | null | undefined;
  name: string | null | undefined;
  size?: number;
  selected?: boolean;
}) {
  const key = resolveVenueCategoryAccentKey({ category, name });
  const color = venueCategoryAccentHex(key);
  return (
    <MapCategoryGlyph
      categoryKey={key}
      size={selected ? size + 2 : size}
      color={color}
      strokeWidth={selected ? 2.4 : 2.2}
    />
  );
}
