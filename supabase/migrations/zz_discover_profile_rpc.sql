-- Discover users by username for friend search even when `profiles.is_private` (RLS hid those rows).
-- Also route `/u/:username` loads through get_profile_for_viewer so private strangers see a locked card, not 404.

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

  if exists (
    select 1
    from public.blocks b
    where (b.blocker_id = uid and b.blocked_id = r.id)
       or (b.blocker_id = r.id and b.blocked_id = uid)
  ) then
    return null;
  end if;

  return jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'display_name', r.display_name,
    'avatar_url', r.avatar_url,
    'is_private', coalesce(r.is_private, false),
    'ghost_mode', coalesce(r.ghost_mode, false)
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

  -- Guests (no JWT): only fully visible public profiles
  if uid is null then
    if coalesce(r.is_private, false) then
      return jsonb_build_object(
        'id', r.id,
        'username', r.username,
        'display_name', r.display_name,
        'bio', null,
        'avatar_url', r.avatar_url,
        'is_private', true,
        'ghost_mode', coalesce(r.ghost_mode, false)
      );
    end if;
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', r.bio,
      'avatar_url', r.avatar_url,
      'is_private', false,
      'ghost_mode', coalesce(r.ghost_mode, false)
    );
  end if;

  if exists (
    select 1
    from public.blocks
    where (blocker_id = uid and blocked_id = r.id)
       or (blocker_id = r.id and blocked_id = uid)
  ) then
    return null;
  end if;

  if r.id = uid then
    return jsonb_build_object(
      'id', r.id,
      'username', r.username,
      'display_name', r.display_name,
      'bio', r.bio,
      'avatar_url', r.avatar_url,
      'is_private', coalesce(r.is_private, false),
      'ghost_mode', coalesce(r.ghost_mode, false)
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
      'ghost_mode', coalesce(r.ghost_mode, false)
    );
  end if;

  -- Private stranger: identity only (no bio / extras)
  return jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'display_name', r.display_name,
    'bio', null,
    'avatar_url', r.avatar_url,
    'is_private', true,
    'ghost_mode', coalesce(r.ghost_mode, false)
  );
end;
$$;

revoke all on function public.get_profile_for_viewer(text) from public;
grant execute on function public.get_profile_for_viewer(text) to anon, authenticated;
