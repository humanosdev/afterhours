/**
 * Trim flat borders off a splash/login lockup PNG, write `public/intencity-splash-lockup.png`,
 * and print dimensions + suggested `--ah-bg-primary` from **corner matte** (matches flat fields in art).
 *
 *   node scripts/process-splash-lockup.mjs path/to/export.png
 *
 * After running, update `src/lib/brandAssets.ts` width/height if they changed, and bump
 * `INTENCITY_BRAND_LOCKUP_ASSET_VERSION` so browsers / PWAs fetch the new PNG.
 * Flat matte pixels are rewritten to the canonical app canvas (`globals.css` `--ah-bg-primary-rgb`)
 * so the bitmap matches `bg-primary` and does not show a “lighter box” behind the lockup.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/process-splash-lockup.mjs <source.png>");
  process.exit(1);
}

const trimmed = sharp(src).trim({ threshold: 18 });
const buf = await trimmed.png({ compressionLevel: 9 }).toBuffer();
const meta = await sharp(buf).metadata();

const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
let r = 0;
let g = 0;
let b = 0;
let n = 0;
const add = (x, y) => {
  const xi = Math.min(w - 1, Math.max(0, x));
  const yi = Math.min(h - 1, Math.max(0, y));
  const i = (yi * w + xi) * 4;
  r += data[i];
  g += data[i + 1];
  b += data[i + 2];
  n += 1;
};
/** 8×8 corners only — avoids blue glow in outer strips skewing the page canvas. */
const strip = Math.min(8, Math.floor(Math.min(w, h) / 24) || 1);
for (let y = 0; y < strip; y++) {
  for (let x = 0; x < strip; x++) {
    add(x, y);
    add(w - 1 - x, y);
    add(x, h - 1 - y);
    add(w - 1 - x, h - 1 - y);
  }
}
const hex =
  "#" +
  [r, g, b]
    .map((v) => Math.round(v / n).toString(16).padStart(2, "0"))
    .join("");

/** Must match `apps/web/src/app/globals.css` `--ah-bg-primary-rgb` (space-separated → RGB tuple). */
const CANVAS_RGB = [10, 12, 24];
/** Stem shadow in the “i” mark — do not flatten (same hull as `IntencityBrandLockupImage` pipeline). */
const SHADOW_RGB = [10, 9, 14];
const SHADOW_R = 3.05;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const shouldSnap = (r0, g0, b0) => {
  const p = [r0, g0, b0];
  if (dist(p, SHADOW_RGB) < SHADOW_R) return false;
  const m = Math.max(r0, g0, b0);
  const dC = dist(p, CANVAS_RGB);
  if (m <= 45 && dC <= 10) return true;
  if (m <= 24 && dC <= 14) return true;
  return false;
};

const raw = Buffer.from(data);
for (let i = 0; i < raw.length; i += 4) {
  const r0 = raw[i];
  const g0 = raw[i + 1];
  const b0 = raw[i + 2];
  if (!shouldSnap(r0, g0, b0)) continue;
  raw[i] = CANVAS_RGB[0];
  raw[i + 1] = CANVAS_RGB[1];
  raw[i + 2] = CANVAS_RGB[2];
}
const normalized = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

const out = path.join(process.cwd(), "public", "intencity-splash-lockup.png");
await fs.writeFile(out, normalized);
console.log(
  JSON.stringify(
    {
      wrote: out,
      width: meta.width,
      height: meta.height,
      cornerSampleHex: hex,
      canvasRgbApplied: CANVAS_RGB.join(" "),
    },
    null,
    2
  )
);
