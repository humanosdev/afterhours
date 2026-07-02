-- Phase 4.5 — server-side stale venue attachment cleanup (zombie heat).
-- Clears venue_id when coords contradict outer ring or row aged past map live window.

create or replace function public.haversine_meters(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 6371000.0 * acos(
    least(
      1.0,
      greatest(
        -1.0,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
        + sin(radians(lat1)) * sin(radians(lat2))
      )
    )
  );
$$;

create or replace function public.reconcile_stale_user_presence_venues()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with cleared as (
    update public.user_presence up
    set
      venue_id = null,
      zone_type = null,
      venue_state = 'outside',
      entered_inner_at = null,
      updated_at = now()
    from public.venues v
    where up.venue_id = v.id
      and (
        -- Dead client: venue still attached after map live window (12m).
        up.updated_at < now() - interval '12 minutes'
        or (
          -- Coords outside outer ring and no fresh client write (≥2m grace).
          up.lat is not null
          and up.lng is not null
          and up.updated_at < now() - interval '2 minutes'
          and public.haversine_meters(up.lat, up.lng, v.lat, v.lng)
            > coalesce(v.outer_radius_m, 110)::double precision
        )
      )
    returning up.user_id
  )
  select count(*)::integer into affected from cleared;

  return coalesce(affected, 0);
end;
$$;

revoke all on function public.reconcile_stale_user_presence_venues() from public;
grant execute on function public.reconcile_stale_user_presence_venues() to service_role;

comment on function public.reconcile_stale_user_presence_venues() is
  'Phase 4.5 — clears zombie venue_id on user_presence when coords are outside outer radius or row is stale.';

-- Schedule every 2 minutes when pg_cron is available (Supabase hosted).
do $cron_setup$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('reconcile-stale-presence-venues');
    exception
      when others then
        null;
    end;

    perform cron.schedule(
      'reconcile-stale-presence-venues',
      '*/2 * * * *',
      $cron$select public.reconcile_stale_user_presence_venues();$cron$
    );
  end if;
end $cron_setup$;
