/** Read-only row from `public.profiles` for the signed-in user (Phase 2F). */
export type MyProfile = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};
