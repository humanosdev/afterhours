/** Hub share display + ingest crops — Instagram feed standards (share-only). */
export type ShareAspectFormat = "portrait" | "square";

export const SHARE_ASPECT_OPTIONS: ReadonlyArray<{
  id: ShareAspectFormat;
  label: string;
  shortLabel: string;
  ratio: number;
}> = [
  { id: "portrait", label: "Portrait", shortLabel: "4:5", ratio: 4 / 5 },
  { id: "square", label: "Square", shortLabel: "1:1", ratio: 1 },
] as const;

export function shareAspectRatio(format: ShareAspectFormat): number {
  return format === "square" ? 1 : 4 / 5;
}

export function aspectRatioForShareFormat(format: ShareAspectFormat): { width: number; height: number } {
  const ratio = shareAspectRatio(format);
  if (ratio >= 1) return { width: 1, height: 1 };
  return { width: 4, height: 5 };
}

/** DB + API normalization — legacy rows default to portrait. */
export function normalizeShareAspect(raw: unknown): ShareAspectFormat {
  return raw === "square" ? "square" : "portrait";
}
