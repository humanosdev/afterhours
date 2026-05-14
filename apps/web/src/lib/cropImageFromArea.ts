import type { Area } from "react-easy-crop";

/** Rasterize `cropArea` from `imageSrc` (object URL or URL). Max long edge `maxDim`. */
export async function cropImageFromArea(imageSrc: string, cropArea: Area, maxDim = 1600): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load selected image"));
  });

  let outW = cropArea.width;
  let outH = cropArea.height;
  const scale = Math.min(maxDim / outW, maxDim / outH, 1);
  outW = Math.max(1, Math.round(outW * scale));
  outH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize image crop");

  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not crop image");
  return blob;
}
