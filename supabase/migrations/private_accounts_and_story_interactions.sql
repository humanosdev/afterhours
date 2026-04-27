-- Private accounts + story interaction policies
-- Run once in Supabase SQL editor (or via migrations)

alter table public.profiles
add column if not exists is_private boolean not null default false;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.requester_id = a and fr.addressee_id = b)
        or
        (fr.requester_id = b and fr.addressee_id = a)
      )
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated, anon;

alter table public.profiles enable row level security;

do $$
declare
  p record;
begin
  -- Remove existing SELECT policies so private logic cannot be bypassed.
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "profiles_select_visible_accounts"
on public.profiles
for select
to authenticated, anon
using (
  not coalesce(is_private, false)
  or auth.uid() = id
  or public.are_friends(auth.uid(), id)
);

-- Story likes: persisted likes + readable counts
alter table public.story_likes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_likes'
      and policyname = 'story_likes_select_authenticated'
  ) then
    create policy "story_likes_select_authenticated"
    on public.story_likes
    for select
    to authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_likes'
      and policyname = 'story_likes_insert_own'
  ) then
    create policy "story_likes_insert_own"
    on public.story_likes
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_likes'
      and policyname = 'story_likes_delete_own'
  ) then
    create policy "story_likes_delete_own"
    on public.story_likes
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

-- Story comments: insert + delete + read
alter table public.story_comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_comments'
      and policyname = 'story_comments_select_authenticated'
  ) then
    create policy "story_comments_select_authenticated"
    on public.story_comments
    for select
    to authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_comments'
      and policyname = 'story_comments_insert_own'
  ) then
    create policy "story_comments_insert_own"
    on public.story_comments
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'story_comments'
      and policyname = 'story_comments_delete_own_or_story_owner'
  ) then
    create policy "story_comments_delete_own_or_story_owner"
    on public.story_comments
    for delete
    to authenticated
    using (
      auth.uid() = user_id
      or exists (
        select 1
        from public.stories s
        where s.id = story_id
          and s.user_id = auth.uid()
      )
    );
  end if;
end $$;
