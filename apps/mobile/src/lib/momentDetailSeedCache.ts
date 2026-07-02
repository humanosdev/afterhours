import type { MomentDetail } from "./fetchMomentDetail";
import { normalizeShareAspect, type ShareAspectFormat } from "./shareAspect";

/** Pass-through snapshot so `/moments/[id]` can paint before `fetchMomentDetail` returns. */
export type MomentDetailSeed = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  is_share: boolean;
  share_aspect?: ShareAspectFormat | null;
  owner_username?: string | null;
  owner_avatar_url?: string | null;
};

const seeds = new Map<string, MomentDetailSeed>();

export function setMomentDetailSeed(seed: MomentDetailSeed): void {
  if (!seed.id.trim() || !seed.image_url.trim()) return;
  seeds.set(seed.id, seed);
}

export function getMomentDetailSeed(storyId: string): MomentDetailSeed | null {
  return seeds.get(storyId) ?? null;
}

export function momentDetailFromSeed(seed: MomentDetailSeed): MomentDetail {
  return {
    id: seed.id,
    user_id: seed.user_id,
    image_url: seed.image_url,
    created_at: seed.created_at,
    is_share: seed.is_share,
    share_visible: true,
    share_hidden: false,
    share_aspect: normalizeShareAspect(seed.share_aspect),
  };
}

export function setMomentDetailSeedFromProfileShare(
  row: { id: string; image_url: string; created_at?: string | null },
  owner: { id: string; username?: string | null; avatar_url?: string | null },
  opts?: { is_share?: boolean; share_aspect?: ShareAspectFormat | null }
): void {
  setMomentDetailSeed({
    id: row.id,
    user_id: owner.id,
    image_url: row.image_url,
    created_at: row.created_at ?? new Date().toISOString(),
    is_share: opts?.is_share ?? true,
    share_aspect: opts?.share_aspect ?? null,
    owner_username: owner.username ?? null,
    owner_avatar_url: owner.avatar_url ?? null,
  });
}
