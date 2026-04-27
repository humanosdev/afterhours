-- Run this in Supabase SQL Editor manually.
-- This migration adds production-ready notifications + notification preferences.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('friend_online', 'friend_joined_venue')),
  venue_id uuid null references public.venues(id) on delete set null,
  created_at timestamptz not null default now(),
  "read" boolean not null default false
);

create index if not exists notifications_recipient_user_id_idx
  on public.notifications(recipient_user_id);

create index if not exists notifications_created_at_desc_idx
  on public.notifications(created_at desc);

create index if not exists notifications_recipient_read_idx
  on public.notifications(recipient_user_id, "read");

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_friend_online boolean not null default true,
  notify_friend_joined_venue boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;

-- Notifications: users can only read/update their own rows.
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

-- Optional insert policy for client-side notification writes.
-- If you later move inserts to Edge Functions, you can tighten/remove this.
drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
  on public.notifications
  for insert
  to authenticated
  with check (auth.uid() = actor_user_id);

-- Preferences: users can read/write only their own preferences.
drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_upsert_own" on public.user_preferences;
create policy "user_preferences_upsert_own"
  on public.user_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh on preference updates.
create or replace function public.touch_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_user_preferences_updated_at on public.user_preferences;
create trigger trg_touch_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.touch_user_preferences_updated_at();

