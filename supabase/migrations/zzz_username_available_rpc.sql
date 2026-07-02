-- Exact username availability for onboarding / profile edit (bypasses RLS; no ILIKE wildcards).

create or replace function public.is_username_available(
  p_username text,
  p_exclude_user_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cleaned text;
  uid uuid := coalesce(p_exclude_user_id, auth.uid());
begin
  cleaned := lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-zA-Z0-9_]', '', 'g'));
  if length(cleaned) < 3 then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(trim(p.username)) = cleaned
      and nullif(trim(p.username), '') is not null
      and (uid is null or p.id <> uid)
  );
end;
$$;

revoke all on function public.is_username_available(text, uuid) from public;
grant execute on function public.is_username_available(text, uuid) to authenticated;
