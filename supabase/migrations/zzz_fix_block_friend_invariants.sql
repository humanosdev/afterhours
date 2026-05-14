-- Friends + blocks invariants (Phase 0 cleanup):
-- 1) Remove stale accepted friendships when a block already exists between the same pair.
-- 2) are_friends() is false whenever either user has blocked the other (fixes RLS + UI drift).
-- 3) discover_profile_by_username: if they blocked you, still return identity + they_blocked_you
--    (blocked user can open profile; search was incorrectly returning null).

-- ---------- 1) Data repair ----------
delete from public.friend_requests fr
where fr.status = 'accepted'
  and exists (
    select 1
    from public.blocks b
    where (b.blocker_id = fr.requester_id and b.blocked_id = fr.addressee_id)
       or (b.blocker_id = fr.addressee_id and b.blocked_id = fr.requester_id)
  );

-- ---------- 2) are_friends ----------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.requester_id = a and fr.addressee_id = b)
        or (fr.requester_id = b and fr.addressee_id = a)
      )
  )
  and not exists (
    select 1
    from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated, anon;

-- ---------- 3) discover_profile_by_username ----------
create or replace function public.discover_profile_by_username(p_needle text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  cleaned text;
  r record;
begin
  if uid is null then
    return null;
  end if;

  cleaned := trim(both '@' from trim(lower(p_needle)));
  if length(cleaned) < 2 then
    return null;
  end if;

  select p.id, p.username, p.display_name, p.avatar_url, p.is_private, p.ghost_mode
  into r
  from public.profiles p
  where lower(p.username) = cleaned
  limit 1;

  if r.id is null then
    return null;
  end if;

  if r.id = uid then
    return null;
  end if;

  -- They blocked you: still surface in username search so the blockee can open /u/:name (restricted profile).
  if exists (
    select 1
    from public.blocks b
    where b.blocker_id = r.id
      and b.blocked_id = uid
  ) then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', 'they_blocked_you'
    );
  end if;

  -- You blocked them: identity + flag (unblock from Friends search / profile).
  if exists (
    select 1
    from public.blocks b
    where b.blocker_id = uid
      and b.blocked_id = r.id
  ) then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', 'you_blocked_them'
    );
  end if;

  return jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'display_name', r.display_name,
    'avatar_url', r.avatar_url,
    'is_private', coalesce(r.is_private, false),
    'ghost_mode', coalesce(r.ghost_mode, false),
    'block_relation', null
  );
end;
$$;

revoke all on function public.discover_profile_by_username(text) from public;
grant execute on function public.discover_profile_by_username(text) to authenticated;
