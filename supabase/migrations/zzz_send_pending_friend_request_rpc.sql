-- Atomic "send friend request" that clears stale graph edges (declined / canceled / duplicate outgoing)
-- which commonly block new inserts when `friend_requests` has a UNIQUE(requester_id, addressee_id) or
-- similar constraint — especially after unfriend, declines, or mutual block/unblock cycles.
-- Runs as SECURITY DEFINER so cleanup is not blocked by RLS hiding old rows from the client.

create or replace function public.send_pending_friend_request(p_addressee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_addressee_id is null or me = p_addressee_id then
    raise exception 'invalid_addressee' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.blocks b
    where (b.blocker_id = me and b.blocked_id = p_addressee_id)
       or (b.blocker_id = p_addressee_id and b.blocked_id = me)
  ) then
    raise exception 'friend_request_blocked' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.requester_id = me and fr.addressee_id = p_addressee_id)
        or (fr.requester_id = p_addressee_id and fr.addressee_id = me)
      )
  ) then
    raise exception 'already_friends' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.friend_requests fr
    where fr.requester_id = p_addressee_id
      and fr.addressee_id = me
      and fr.status = 'pending'
  ) then
    raise exception 'incoming_friend_request_exists' using errcode = 'P0001';
  end if;

  -- Remove my outgoing row for this person (any status) so a fresh pending insert always works.
  delete from public.friend_requests fr
  where fr.requester_id = me
    and fr.addressee_id = p_addressee_id;

  -- Remove their stale non-active rows toward me (declined / canceled only — keep active incoming pending).
  delete from public.friend_requests fr
  where fr.requester_id = p_addressee_id
    and fr.addressee_id = me
    and fr.status in ('declined', 'canceled');

  insert into public.friend_requests (requester_id, addressee_id, status)
  values (me, p_addressee_id, 'pending');
end;
$$;

revoke all on function public.send_pending_friend_request(uuid) from public;
grant execute on function public.send_pending_friend_request(uuid) to authenticated;
