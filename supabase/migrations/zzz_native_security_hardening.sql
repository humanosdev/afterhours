-- Native cutover security hardening (2026-07-01):
-- 1) user_presence SELECT: friends-only, exclude ghost rows for non-self
-- 2) user_presence DELETE: own row (sign-out clear)
-- 3) messages INSERT: chat participant + no active block
-- 4) profiles UPDATE: guard privileged / lifecycle columns
-- 5) notifications: server RPC only (drop client INSERT policy)
-- Does not touch zzz_presence_stale_venue_reconcile (Phase 4.5 cron).

-- ---------- helpers ----------
create or replace function public.users_have_block(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

grant execute on function public.users_have_block(uuid, uuid) to authenticated;

create or replace function public.notification_type_enabled_for_recipient(
  p_recipient_id uuid,
  p_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when p_type in ('friend_online', 'friend_nearby', 'friend_joined_venue', 'friends_active_bundle')
        then np.friend_activity_enabled
      when p_type in ('friend_request_received', 'friend_request_accepted')
        then np.friend_request_enabled
      when p_type in ('story_like', 'story_comment', 'friend_story')
        then np.stories_enabled
      when p_type = 'venue_popping'
        then np.venue_pop_enabled
      when p_type = 'message'
        then np.messages_enabled
      else true
    end,
    true
  )
  from public.notification_preferences np
  where np.user_id = p_recipient_id
  union all
  select true
  limit 1;
$$;

grant execute on function public.notification_type_enabled_for_recipient(uuid, text) to authenticated;

-- ---------- user_presence RLS ----------
alter table if exists public.user_presence enable row level security;

drop policy if exists "Anyone can read presence" on public.user_presence;
drop policy if exists user_presence_select_friends_visible on public.user_presence;

create policy user_presence_select_friends_visible
on public.user_presence
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    public.are_friends(auth.uid(), user_id)
    and not coalesce(
      (select p.ghost_mode from public.profiles p where p.id = user_presence.user_id limit 1),
      false
    )
  )
);

drop policy if exists user_presence_delete_own on public.user_presence;
create policy user_presence_delete_own
on public.user_presence
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------- messages RLS ----------
drop policy if exists "messages insert own" on public.messages;
drop policy if exists messages_insert_participant_unblocked on public.messages;

create policy messages_insert_participant_unblocked
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> receiver_id
  and exists (
    select 1
    from public.chats c
    where c.id = messages.chat_id
      and (
        (c.user1_id = auth.uid() and c.user2_id = messages.receiver_id)
        or (c.user2_id = auth.uid() and c.user1_id = messages.receiver_id)
      )
  )
  and not public.users_have_block(auth.uid(), messages.receiver_id)
);

-- ---------- profiles UPDATE guard ----------
create or replace function public.guard_profiles_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    raise exception 'profiles_is_admin_readonly' using errcode = '42501';
  end if;
  if new.account_lifecycle_state is distinct from old.account_lifecycle_state then
    raise exception 'profiles_lifecycle_readonly' using errcode = '42501';
  end if;
  if new.account_purge_at is distinct from old.account_purge_at then
    raise exception 'profiles_lifecycle_readonly' using errcode = '42501';
  end if;
  if new.paused_at is distinct from old.paused_at then
    raise exception 'profiles_lifecycle_readonly' using errcode = '42501';
  end if;
  if new.delete_requested_at is distinct from old.delete_requested_at then
    raise exception 'profiles_lifecycle_readonly' using errcode = '42501';
  end if;
  if new.access_level is distinct from old.access_level then
    raise exception 'profiles_access_level_readonly' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profiles_self_update on public.profiles;
create trigger trg_guard_profiles_self_update
before update on public.profiles
for each row
when (auth.uid() = old.id)
execute function public.guard_profiles_self_update();

-- ---------- notifications: RPC + revoke client INSERT ----------
create or replace function public.create_notification_v1(
  p_recipient_id uuid,
  p_type text,
  p_venue_id uuid default null,
  p_story_id uuid default null,
  p_comment_id uuid default null,
  p_chat_id uuid default null,
  p_message_preview text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  inserted_id uuid;
  allow_type boolean := false;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_recipient_id is null or p_recipient_id = actor then
    return null;
  end if;

  if public.users_have_block(actor, p_recipient_id) then
    return null;
  end if;

  if not public.notification_type_enabled_for_recipient(p_recipient_id, p_type) then
    return null;
  end if;

  case p_type
    when 'message' then
      allow_type := p_chat_id is not null
        and exists (
          select 1
          from public.chats c
          where c.id = p_chat_id
            and (
              (c.user1_id = actor and c.user2_id = p_recipient_id)
              or (c.user2_id = actor and c.user1_id = p_recipient_id)
            )
        );
    when 'story_like' then
      allow_type := p_story_id is not null
        and exists (
          select 1
          from public.stories s
          where s.id = p_story_id
            and s.user_id = p_recipient_id
            and s.user_id <> actor
        )
        and public.can_view_story_for_social(p_story_id, actor);
    when 'story_comment' then
      allow_type := p_story_id is not null
        and exists (
          select 1
          from public.stories s
          where s.id = p_story_id
            and s.user_id = p_recipient_id
            and s.user_id <> actor
        )
        and public.can_view_story_for_social(p_story_id, actor);
    when 'friend_story' then
      allow_type := p_story_id is not null
        and public.are_friends(actor, p_recipient_id)
        and exists (
          select 1
          from public.stories s
          where s.id = p_story_id
            and s.user_id = actor
        );
    when 'friend_request_accepted' then
      allow_type := exists (
        select 1
        from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.requester_id = actor and fr.addressee_id = p_recipient_id)
            or (fr.requester_id = p_recipient_id and fr.addressee_id = actor)
          )
      );
    when 'friend_online' then
      allow_type := public.are_friends(actor, p_recipient_id);
    when 'friend_nearby' then
      allow_type := public.are_friends(actor, p_recipient_id);
    when 'friend_joined_venue' then
      allow_type := public.are_friends(actor, p_recipient_id);
    when 'friends_active_bundle' then
      allow_type := public.are_friends(actor, p_recipient_id);
    when 'venue_popping' then
      allow_type := public.are_friends(actor, p_recipient_id);
    else
      allow_type := false;
  end case;

  if not allow_type then
    return null;
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    type,
    venue_id,
    story_id,
    comment_id,
    chat_id,
    message_preview,
    dedupe_key
  )
  values (
    p_recipient_id,
    actor,
    p_type,
    p_venue_id,
    p_story_id,
    p_comment_id,
    p_chat_id,
    nullif(left(trim(coalesce(p_message_preview, '')), 140), ''),
    p_dedupe_key
  )
  returning id into inserted_id;

  return inserted_id;
exception
  when unique_violation then
    return null;
end;
$$;

revoke all on function public.create_notification_v1(uuid, text, uuid, uuid, uuid, uuid, text, text) from public;
grant execute on function public.create_notification_v1(uuid, text, uuid, uuid, uuid, uuid, text, text) to authenticated;

drop policy if exists "notifications_insert_authenticated" on public.notifications;

comment on function public.create_notification_v1(uuid, text, uuid, uuid, uuid, uuid, text, text) is
  'Validated in-app notification insert for clients. friend_request_received remains DB-trigger only.';
