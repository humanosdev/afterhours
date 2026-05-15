-- Hub / discovery people search used raw `profiles` + ilike under RLS. Private accounts are only
-- visible via RLS when self, friends, FoF edge, or an active block row — so after unblock + unfriend,
-- one side can "lose" the other in search while the public account still matches. This RPC runs as
-- SECURITY DEFINER (same pattern as discover_profile_by_username) so authenticated search can
-- return basic identity fields for matching rows without exposing full profile content policies.

create or replace function public.search_profiles_discovery(p_needle text, p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  cleaned text;
  esc text;
  pat text;
  lim int;
begin
  if me is null then
    return '[]'::jsonb;
  end if;

  cleaned := trim(both from p_needle);
  if length(cleaned) < 1 then
    return '[]'::jsonb;
  end if;

  lim := greatest(1, least(coalesce(nullif(p_limit, 0), 20), 50));

  esc := replace(replace(replace(cleaned, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  pat := '%' || esc || '%';

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'username', s.username,
          'display_name', s.display_name,
          'avatar_url', s.avatar_url
        )
        order by lower(coalesce(s.username, '')) nulls last
      )
      from (
        select distinct on (p.id) p.id, p.username, p.display_name, p.avatar_url
        from public.profiles p
        where p.id <> me
          and (
            coalesce(p.display_name, '') ilike pat escape '\'
            or coalesce(p.username, '') ilike pat escape '\'
          )
        order by p.id
        limit lim
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.search_profiles_discovery(text, int) from public;
grant execute on function public.search_profiles_discovery(text, int) to authenticated;
