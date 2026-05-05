-- Notifications v1 rebuild after runtime reset.
-- Recreates notifications + push_subscriptions, and extends preferences for message toggles.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  venue_id uuid null references public.venues(id) on delete set null,
  story_id uuid null references public.stories(id) on delete cascade,
  comment_id uuid null references public.story_comments(id) on delete cascade,
  chat_id uuid null references public.chats(id) on delete cascade,
  message_preview text null,
  dedupe_key text null,
  created_at timestamptz not null default now(),
  "read" boolean not null default false,
  constraint notifications_type_check check (
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
  )
);

create index if not exists notifications_recipient_user_id_idx
  on public.notifications(recipient_user_id);

create index if not exists notifications_created_at_desc_idx
  on public.notifications(created_at desc);

create index if not exists notifications_recipient_read_idx
  on public.notifications(recipient_user_id, "read");

create index if not exists notifications_recipient_type_read_idx
  on public.notifications(recipient_user_id, type, "read");

create unique index if not exists notifications_dedupe_key_unique_idx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = recipient_user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);

drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
  on public.notifications
  for insert
  to authenticated
  with check (auth.uid() = actor_user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.notification_preferences
  add column if not exists messages_enabled boolean not null default true;
