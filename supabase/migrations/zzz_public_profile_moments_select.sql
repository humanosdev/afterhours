-- Public profiles: non-friends may read active moments (and record views) when not blocked.
-- Mirrors client `viewerCanSeeOwnerPosts` / PWA `/u/[username]` moment load gate.

create or replace function public.viewer_can_see_owner_moments(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer is not null
    and owner is not null
    and (
      viewer = owner
      or (
        not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = viewer and b.blocked_id = owner)
             or (b.blocker_id = owner and b.blocked_id = viewer)
        )
        and (
          public.are_friends(viewer, owner)
          or not coalesce(
            (select p.is_private from public.profiles p where p.id = owner limit 1),
            false
          )
        )
      )
    );
$$;

grant execute on function public.viewer_can_see_owner_moments(uuid, uuid) to authenticated;

drop policy if exists "stories_select_policy" on public.stories;
create policy "stories_select_policy"
on public.stories
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    coalesce(is_share, false) = true
    and coalesce(share_visible, false) = true
    and coalesce(share_hidden, false) = false
  )
  or (
    coalesce(is_share, false) = false
    and public.viewer_can_see_owner_moments(auth.uid(), user_id)
    and coalesce(expires_at::timestamptz, created_at + interval '24 hours') > now()
  )
);

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
        or (
          coalesce(s.is_share, false) = false
          and public.viewer_can_see_owner_moments(auth.uid(), s.user_id)
          and coalesce(s.expires_at::timestamptz, s.created_at + interval '24 hours') > now()
        )
        or (
          coalesce(s.is_share, false) = true
          and coalesce(s.share_visible, false) = true
          and coalesce(s.share_hidden, false) = false
        )
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
        or (
          coalesce(s.is_share, false) = false
          and public.viewer_can_see_owner_moments(auth.uid(), s.user_id)
          and coalesce(s.expires_at::timestamptz, s.created_at + interval '24 hours') > now()
        )
        or (
          coalesce(s.is_share, false) = true
          and coalesce(s.share_visible, false) = true
          and coalesce(s.share_hidden, false) = false
        )
      )
  )
);
