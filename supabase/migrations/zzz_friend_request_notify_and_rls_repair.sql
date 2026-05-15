-- 1) Repair notifications.type CHECK: smart_notifications_foundation.sql replaced the constraint with a list
--    that omitted friend_request_received, so client inserts silently fail (apps/web createNotification).
-- 2) Re-assert friend_requests SELECT for participants + FoF accepted graph (safe if already correct).
-- 3) AFTER INSERT trigger (SECURITY DEFINER) inserts friend_request_received with preview + dedupe_key
--    so delivery survives client bugs; failures are caught so the friend_requests row still commits.

-- ---------- notifications: canonical type list ----------
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'friend_online',
      'friend_nearby',
      'friend_joined_venue',
      'friends_active_bundle',
      'friend_story',
      'friend_request_received',
      'friend_request_accepted',
      'venue_popping',
      'story_like',
      'story_comment',
      'message'
    )
  );

-- ---------- friend_requests: SELECT policy ----------
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

-- ---------- Trigger: notify addressee on new pending request ----------
create or replace function public.trg_friend_requests_notify_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allow_fr boolean;
  dn text;
  un text;
  av text;
  preview text;
begin
  if new.status is distinct from 'pending' then
    return new;
  end if;

  select coalesce(
    (
      select fp.friend_request_enabled
      from public.notification_preferences fp
      where fp.user_id = new.addressee_id
    ),
    true
  )
  into allow_fr;

  if allow_fr is false then
    return new;
  end if;

  select
    nullif(trim(coalesce(p.display_name, '')), ''),
    nullif(trim(coalesce(p.username, '')), ''),
    nullif(trim(coalesce(p.avatar_url, '')), '')
  into dn, un, av
  from public.profiles p
  where p.id = new.requester_id;

  if dn is null and un is null and av is null then
    preview := null;
  else
    preview := json_build_object('dn', dn, 'un', un, 'av', av)::text;
  end if;

  begin
    insert into public.notifications (
      recipient_user_id,
      actor_user_id,
      type,
      message_preview,
      dedupe_key
    )
    values (
      new.addressee_id,
      new.requester_id,
      'friend_request_received',
      preview,
      'friend_request:' || new.id::text
    );
  exception
    when others then
      raise warning 'trg_friend_requests_notify_recipient: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_friend_requests_notify_recipient on public.friend_requests;
create trigger trg_friend_requests_notify_recipient
after insert on public.friend_requests
for each row
execute function public.trg_friend_requests_notify_recipient();
