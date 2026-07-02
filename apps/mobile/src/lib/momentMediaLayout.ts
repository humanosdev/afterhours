import { probeOrientedImageSize } from "./shareCropExport";

const STORY_ASPECT = 9 / 16;
const FILL_CUTOUT_TOLERANCE = 0.08;

export type MomentImageLayout = {
  fillCutout: boolean;
  width: number;
  height: number;
};

/** Sync layout guess from camera/picker metadata — no ImageManipulator round-trip. */
export function momentLayoutFromDimensions(width: number, height: number): MomentImageLayout {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const aspect = w / h;
  return {
    width: w,
    height: h,
    fillCutout: aspect <= STORY_ASPECT + FILL_CUTOUT_TOLERANCE,
  };
}

/** Portrait or taller than 9:16 — fill the IG cutout with cover. */
export async function momentUsesFillCutout(uri: string): Promise<boolean> {
  const layout = await loadMomentImageLayout(uri);
  return layout?.fillCutout ?? true;
}

/** Oriented dimensions for moment preview layout + crop export. */
export async function loadMomentImageLayout(uri: string): Promise<MomentImageLayout | null> {
  const probed = await probeOrientedImageSize(uri);
  if (!probed) return null;
  const { width, height } = probed;
  return momentLayoutFromDimensions(width, height);
}
