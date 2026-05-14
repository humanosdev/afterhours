-- Block + discover behavior:
-- 1) Any block insert removes pending/accepted friend_requests between the pair (defense in depth; client also deletes).
-- 2) discover_profile_by_username: always returns a match except when the viewer was blocked by the target
--    (blocked user cannot username-discover the person who blocked them).
-- 3) get_profile_for_viewer: never returns null solely due to blocks; returns minimal card + block_relation.

create or replace function public.remove_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_requests fr
  where fr.status in ('accepted', 'pending')
    and (
      (fr.requester_id = new.blocker_id and fr.addressee_id = new.blocked_id)
      or (fr.requester_id = new.blocked_id and fr.addressee_id = new.blocker_id)
    );
  return new;
end;
$$;

drop trigger if exists trg_blocks_remove_friends on public.blocks;
create trigger trg_blocks_remove_friends
after insert on public.blocks
for each row execute function public.remove_friendship_on_block();


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

  -- Target blocked the searcher: do not surface in username discover.
  if exists (
    select 1
    from public.blocks b
    where b.blocker_id = r.id
      and b.blocked_id = uid
  ) then
    return null;
  end if;

  -- Searcher blocked target: show identity + flag (can unblock from profile / future UI).
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


create or replace function public.get_profile_for_viewer(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  r record;
  i_blocked_them boolean;
  they_blocked_me boolean;
begin
  if p_username is null or trim(p_username) = '' then
    return null;
  end if;

  select id, username, display_name, bio, avatar_url, is_private, ghost_mode
  into r
  from public.profiles
  where lower(username) = lower(trim(p_username))
  limit 1;

  if r.id is null then
    return null;
  end if;

  -- Guests (no JWT): only fully visible public profiles; blocks N/A without uid.
  if uid is null then
    if coalesce(r.is_private, false) then
      return jsonb_build_object(
        'id', r.id,
        'username', r.username,
        'display_name', r.display_name,
        'bio', null,
        'avatar_url', r.avatar_url,
        'is_private', true,
        'ghost_mode', coalesce(r.ghost_mode, false),
        'block_relation', null
      );
    end if;
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', r.bio,
      'avatar_url', r.avatar_url,
      'is_private', false,
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', null
    );
  end if;

  i_blocked_them := exists (
    select 1 from public.blocks b
    where b.blocker_id = uid and b.blocked_id = r.id
  );
  they_blocked_me := exists (
    select 1 from public.blocks b
    where b.blocker_id = r.id and b.blocked_id = uid
  );

  if they_blocked_me then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', null,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', 'they_blocked_you'
    );
  end if;

  if i_blocked_them then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', null,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', 'you_blocked_them'
    );
  end if;

  if r.id = uid then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', r.bio,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', null
    );
  end if;

  if public.are_friends(uid, r.id) or not coalesce(r.is_private, false) then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', r.bio,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false),
      'block_relation', null
    );
  end if;

  return jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'display_name', r.display_name,
    'bio', null,
    'avatar_url', r.avatar_url,
    'is_private', true,
    'ghost_mode', coalesce(r.ghost_mode, false),
    'block_relation', null
  );
end;
$$;

revoke all on function public.get_profile_for_viewer(text) from public;
grant execute on function public.get_profile_for_viewer(text) to anon, authenticated;
