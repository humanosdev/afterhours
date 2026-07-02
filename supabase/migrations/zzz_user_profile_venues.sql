-- Profile venues: permanent venue history after 15+ minutes in the inner zone (one row per user+venue).

-- Rename legacy table if an older `user_profile_places` migration was applied.
do $$
begin
  if to_regclass('public.user_profile_places') is not null
     and to_regclass('public.user_profile_venues') is null then
    alter table public.user_profile_places rename to user_profile_venues;
  end if;
end $$;

alter index if exists user_profile_places_user_earned_idx
  rename to user_profile_venues_user_earned_idx;

create table if not exists public.user_profile_venues (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

create index if not exists user_profile_venues_user_earned_idx
  on public.user_profile_venues (user_id, earned_at desc);

alter table public.user_profile_venues enable row level security;

drop policy if exists "user_profile_places_select" on public.user_profile_venues;
drop policy if exists "user_profile_venues_select" on public.user_profile_venues;
create policy "user_profile_venues_select"
on public.user_profile_venues
for select
to authenticated
using (
  user_id = auth.uid()
  or public.viewer_can_see_owner_moments(auth.uid(), user_id)
);

drop function if exists public.maybe_earn_profile_place(uuid, uuid, text, timestamptz);

create or replace function public.maybe_earn_profile_venue(
  p_user_id uuid,
  p_venue_id uuid,
  p_zone_type text,
  p_entered_inner_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;
  if p_zone_type is distinct from 'inner' then
    return false;
  end if;
  if p_venue_id is null then
    return false;
  end if;
  if p_entered_inner_at is null then
    return false;
  end if;
  if now() - p_entered_inner_at < interval '15 minutes' then
    return false;
  end if;

  insert into public.user_profile_venues (user_id, venue_id, earned_at)
  values (p_user_id, p_venue_id, now())
  on conflict (user_id, venue_id) do nothing;

  return true;
end;
$$;

grant execute on function public.maybe_earn_profile_venue(uuid, uuid, text, timestamptz) to authenticated;

drop table if exists public.user_profile_places;

comment on table public.user_profile_venues is
  'Permanent profile venues — earned after 15+ continuous minutes in a venue inner zone; deduped per user+venue.';
