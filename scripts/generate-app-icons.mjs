/**
 * Builds full-bleed launcher icons from public/app-icon-source.png:
 * trims excess black padding, then composites onto pure #000 at ~98% fill
 * so the squircle reads edge-to-edge on iOS home screen.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "..", "public");
const src = path.join(pub, "app-icon-source.png");
const FILL = 0.98;

async function makeSquareIcon(px, outName) {
  const inner = Math.max(2, Math.round(px * FILL));
  const trimmed = sharp(src).trim({
    threshold: 18,
  });
  const logo = await trimmed.resize(inner, inner, { fit: "inside" }).png().toBuffer();

  await sharp({
    create: {
      width: px,
      height: px,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(pub, outName));
}

await makeSquareIcon(180, "apple-touch-icon.png");
await makeSquareIcon(192, "icon-192.png");
await makeSquareIcon(512, "icon-512.png");
console.log("Wrote apple-touch-icon.png, icon-192.png, icon-512.png");
