/**
 * Builds launcher icons from `public/app-icon-source.png` (square master, e.g. 1024×1024).
 * Straight resize — no trim / black matte (icons ship as finished squircle art on #0A0C18 canvas).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "..", "public");
const src = path.join(pub, "app-icon-source.png");

/** Slight zoom-in crop so the mark fills more of the iOS/Android launcher tile (less empty padding). */
async function exportIcon(px, outName) {
  const zoom = 1.22;
  const big = Math.max(2, Math.round(px * zoom));
  await sharp(src)
    .resize(big, big, { fit: "cover" })
    .extract({
      left: Math.max(0, Math.floor((big - px) / 2)),
      top: Math.max(0, Math.floor((big - px) / 2)),
      width: Math.min(big, px),
      height: Math.min(big, px),
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(pub, outName));
}

await exportIcon(180, "apple-touch-icon.png");
await exportIcon(192, "icon-192.png");
await exportIcon(512, "icon-512.png");
console.log("Wrote apple-touch-icon.png, icon-192.png, icon-512.png");
