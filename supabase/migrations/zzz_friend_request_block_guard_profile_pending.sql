-- 1) Database: never insert a pending friend_request while a block exists between the pair
--    (app already checks; this is defense in depth).
-- 2) Profiles RLS: counterparties in a *pending* request can read each other's row when
--    there is no block, so /profile/:uuid can resolve username → /u/:name from notifications / friends.

create or replace function public.assert_friend_request_not_blocked()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.requester_id = new.addressee_id then
    raise exception 'friend_request_invalid_pair' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.blocks b
    where (b.blocker_id = new.requester_id and b.blocked_id = new.addressee_id)
       or (b.blocker_id = new.addressee_id and b.blocked_id = new.requester_id)
  ) then
    raise exception 'friend_request_blocked' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friend_requests_assert_no_block on public.friend_requests;
create trigger trg_friend_requests_assert_no_block
before insert on public.friend_requests
for each row
execute function public.assert_friend_request_not_blocked();

-- Extend profile visibility (see zzz_profiles_select_block_pairs.sql for baseline).
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
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
         or (b.blocker_id = profiles.id and b.blocked_id = auth.uid())
    )
    and exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.requester_id = profiles.id and fr.addressee_id = auth.uid())
          or (fr.addressee_id = profiles.id and fr.requester_id = auth.uid())
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
