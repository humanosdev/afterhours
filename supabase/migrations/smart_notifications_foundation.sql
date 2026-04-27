create extension if not exists pgcrypto;

-- Expand notifications types for smart notification system.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'friend_online',
      'friend_joined_venue',
      'friends_active_bundle',
      'friend_story',
      'friend_request_accepted',
      'venue_popping'
    )
  );

-- Canonical preference table for smart notifications.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  friend_activity_enabled boolean not null default true,
  venue_pop_enabled boolean not null default true,
  friend_request_enabled boolean not null default true,
  stories_enabled boolean not null default true,
  quiet_hours_start time null,
  quiet_hours_end time null,
  last_sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_upsert_own" on public.notification_preferences;
create policy "notification_preferences_upsert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create or replace function public.touch_notification_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_touch_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.touch_notification_preferences_updated_at();
