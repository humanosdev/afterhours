/**
 * Trim flat borders off a splash/login lockup PNG, write `public/intencity-splash-lockup.png`,
 * and print dimensions + suggested `--ah-bg-primary` from **corner matte** (matches flat fields in art).
 *
 *   node scripts/process-splash-lockup.mjs path/to/export.png
 *
 * After running, update `src/lib/brandAssets.ts` width/height if they changed, and sync
 * `--ah-bg-primary` / Tailwind `primary` / manifest `theme_color` with `suggestedCanvasHex`.
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

const out = path.join(process.cwd(), "public", "intencity-splash-lockup.png");
await fs.writeFile(out, buf);
console.log(
  JSON.stringify(
    {
      wrote: out,
      width: meta.width,
      height: meta.height,
      suggestedCanvasHex: hex,
    },
    null,
    2
  )
);
