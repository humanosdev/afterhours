import * as ImageManipulator from "expo-image-manipulator";
import jpeg from "jpeg-js";
import { mediaLayout } from "../theme/mediaLayout";

const SAMPLE_WIDTH = 48;
const BACKDROP_DIM_FACTOR = 0.42;

const cache = new Map<string, string>();

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function averageRgbFromRgba(data: Uint8Array): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return { r: 20, g: 24, b: 32 };
  return { r: r / count, g: g / count, b: b / count };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.round(Math.max(0, Math.min(255, c)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Darkened matte tone for crop letterbox / moment backdrop. */
export function backdropFromRgb(
  r: number,
  g: number,
  b: number,
  factor = BACKDROP_DIM_FACTOR
): string {
  return rgbToHex(r * factor, g * factor, b * factor);
}

/** Sample a downscaled JPEG and return a matte backdrop hex color. */
export async function extractImageBackdropColor(uri: string): Promise<string> {
  const cached = cache.get(uri);
  if (cached) return cached;

  try {
    const { base64 } = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: SAMPLE_WIDTH } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!base64) return mediaLayout.placeholderColor;

    const decoded = jpeg.decode(base64ToUint8Array(base64), { useTArray: true });
    const avg = averageRgbFromRgba(decoded.data);
    const color = backdropFromRgb(avg.r, avg.g, avg.b);
    cache.set(uri, color);
    return color;
  } catch {
    return mediaLayout.placeholderColor;
  }
}
