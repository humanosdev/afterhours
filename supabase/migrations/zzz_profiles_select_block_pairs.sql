-- Allow each side of an active block to read the other's profile row so:
-- - /profile/blocks can show names/avatars for private accounts you blocked
-- - /profile/blocks can show who blocked you (same visibility need)
-- Block graph is already symmetric for messaging; this only fixes SELECT on profiles.

drop policy if exists "profiles_select_visible_accounts" on public.profiles;

create policy "profiles_select_visible_accounts"
on public.profiles
for select
to authenticated, anon
using (
  not coalesce(is_private, false)
  or (auth.uid() is not null and auth.uid() = id)
  or (auth.uid() is not null and public.are_friends(auth.uid(), id))
  or (
    auth.uid() is not null
    and exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (
            fr.addressee_id = profiles.id
            and public.are_friends(auth.uid(), fr.requester_id)
          )
          or (
            fr.requester_id = profiles.id
            and public.are_friends(auth.uid(), fr.addressee_id)
          )
        )
    )
  )
  or (
    auth.uid() is not null
    and exists (
      select 1
      from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
         or (b.blocked_id = auth.uid() and b.blocker_id = profiles.id)
    )
  )
);
