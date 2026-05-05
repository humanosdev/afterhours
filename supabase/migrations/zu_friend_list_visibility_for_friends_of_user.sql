-- Friend list when viewing someone else's profile (e.g. /profile/friends?view=username)
-- Depends on: public.are_friends() from private_accounts_and_story_interactions.sql
--
-- Problem: RLS on friend_requests only allowed rows where auth.uid() was requester or
-- addressee, so loading "Vincent's friends" returned only the row (Vincent, viewer).
--
-- Fix:
-- 1) friend_requests SELECT: also allow accepted rows where the viewer is friends with
--    either endpoint (so they can load another user's full accepted friend graph).
-- 2) profiles SELECT: allow reading a user if they appear as the "other end" of an
--    accepted friendship where the viewer is friends with the near endpoint (so
--    private friends-of-friend still resolve for the friends list UI).

-- ---------- friend_requests: replace SELECT policies with one policy ----------
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_requests'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.friend_requests', p.policyname);
  end loop;
end $$;

create policy "friend_requests_select_authenticated"
on public.friend_requests
for select
to authenticated
using (
  auth.uid() = requester_id
  or auth.uid() = addressee_id
  or (
    status = 'accepted'
    and (
      public.are_friends(auth.uid(), requester_id)
      or public.are_friends(auth.uid(), addressee_id)
    )
  )
);

-- ---------- profiles: extend visible accounts ----------
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
);
