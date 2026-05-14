-- Per-viewer story opens: hub ring glows until every active moment in the deck has been seen.

create table if not exists public.story_views (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (viewer_id, story_id)
);

create index if not exists story_views_story_id_idx on public.story_views (story_id);

alter table public.story_views enable row level security;

drop policy if exists "story_views_select_own" on public.story_views;
create policy "story_views_select_own"
on public.story_views
for select
to authenticated
using (viewer_id = auth.uid());

drop policy if exists "story_views_insert_own_visible" on public.story_views;
create policy "story_views_insert_own_visible"
on public.story_views
for insert
to authenticated
with check (
  viewer_id = auth.uid()
  and exists (
    select 1
    from public.stories s
    where s.id = story_id
      and (
        s.user_id = auth.uid()
        or public.are_friends(auth.uid(), s.user_id)
      )
  )
);

drop policy if exists "story_views_update_own_visible" on public.story_views;
create policy "story_views_update_own_visible"
on public.story_views
for update
to authenticated
using (viewer_id = auth.uid())
with check (
  viewer_id = auth.uid()
  and exists (
    select 1
    from public.stories s
    where s.id = story_id
      and (
        s.user_id = auth.uid()
        or public.are_friends(auth.uid(), s.user_id)
      )
  )
);

grant select, insert, update on public.story_views to authenticated;
