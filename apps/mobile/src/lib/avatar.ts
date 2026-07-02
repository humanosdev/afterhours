/** Single avatar URI normalization — every surface uses this before `Image`. */
export function resolveAvatarUri(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}
