-- MODERATION-1: user reports, auto-hide at 3 distinct reporters, admin review.
-- Set your moderator: update public.profiles set is_admin = true where id = '<uuid>';

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.stories
  add column if not exists moderation_status text not null default 'visible';

alter table public.story_comments
  add column if not exists moderation_status text not null default 'visible';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_moderation_status_check'
  ) then
    alter table public.stories
      add constraint stories_moderation_status_check
      check (moderation_status in ('visible', 'pending_review', 'removed', 'restored'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'story_comments_moderation_status_check'
  ) then
    alter table public.story_comments
      add constraint story_comments_moderation_status_check
      check (moderation_status in ('visible', 'pending_review', 'removed', 'restored'));
  end if;
end $$;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text null,
  created_at timestamptz not null default now(),
  constraint content_reports_target_type_check
    check (target_type in ('story', 'comment')),
  constraint content_reports_reason_check
    check (reason in (
      'spam',
      'harassment',
      'hate',
      'nudity',
      'violence',
      'impersonation',
      'other'
    )),
  constraint content_reports_unique_reporter_target
    unique (reporter_id, target_type, target_id)
);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid() limit 1),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.users_are_blocked(a uuid, b uuid)
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

grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create or replace function public.report_target_owner(p_target_type text, p_target_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_target_type = 'story' then (
      select s.user_id from public.stories s where s.id = p_target_id limit 1
    )
    when p_target_type = 'comment' then (
      select c.user_id from public.story_comments c where c.id = p_target_id limit 1
    )
    else null
  end;
$$;

grant execute on function public.report_target_owner(text, uuid) to authenticated;

create or replace function public.apply_report_auto_review(p_target_type text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_threshold int := 3;
begin
  select count(distinct r.reporter_id)::int
  into v_count
  from public.content_reports r
  where r.target_type = p_target_type
    and r.target_id = p_target_id;

  if v_count < v_threshold then
    return;
  end if;

  if p_target_type = 'story' then
    update public.stories s
    set moderation_status = 'pending_review'
    where s.id = p_target_id
      and coalesce(s.moderation_status, 'visible') = 'visible';
  elsif p_target_type = 'comment' then
    update public.story_comments c
    set moderation_status = 'pending_review'
    where c.id = p_target_id
      and coalesce(c.moderation_status, 'visible') = 'visible';
  end if;
end;
$$;

grant execute on function public.apply_report_auto_review(text, uuid) to authenticated;

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter uuid := auth.uid();
  v_owner uuid;
  v_details text;
begin
  if v_reporter is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_target_type not in ('story', 'comment') then
    return jsonb_build_object('ok', false, 'error', 'invalid_target_type');
  end if;

  if p_reason not in ('spam', 'harassment', 'hate', 'nudity', 'violence', 'impersonation', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;

  v_owner := public.report_target_owner(p_target_type, p_target_id);
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'target_not_found');
  end if;

  if v_owner = v_reporter then
    return jsonb_build_object('ok', false, 'error', 'cannot_report_own_content');
  end if;

  if public.users_are_blocked(v_reporter, v_owner) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  v_details := nullif(trim(coalesce(p_details, '')), '');
  if v_details is not null and length(v_details) > 2000 then
    v_details := left(v_details, 2000);
  end if;

  begin
    insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
    values (v_reporter, p_target_type, p_target_id, p_reason, v_details);
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'already_reported');
  end;

  perform public.apply_report_auto_review(p_target_type, p_target_id);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;

create or replace function public.admin_resolve_moderation(
  p_target_type text,
  p_target_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_decision = 'approve' then
    v_status := 'visible';
  elsif p_decision = 'remove' then
    v_status := 'removed';
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_decision');
  end if;

  if p_target_type = 'story' then
    update public.stories
    set moderation_status = v_status
    where id = p_target_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'target_not_found');
    end if;
  elsif p_target_type = 'comment' then
    update public.story_comments
    set moderation_status = v_status
    where id = p_target_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'target_not_found');
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_target_type');
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

grant execute on function public.admin_resolve_moderation(text, uuid, text) to authenticated;

-- RLS: content_reports
drop policy if exists content_reports_insert_own on public.content_reports;
create policy content_reports_insert_own
on public.content_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists content_reports_select_own_or_admin on public.content_reports;
create policy content_reports_select_own_or_admin
on public.content_reports
for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

-- Stories SELECT: hide moderated content except owner + admin
drop policy if exists "stories_select_policy" on public.stories;
create policy "stories_select_policy"
on public.stories
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (
    coalesce(moderation_status, 'visible') = 'visible'
    and (
      (
        coalesce(is_share, false) = true
        and coalesce(share_visible, false) = true
        and coalesce(share_hidden, false) = false
      )
      or (
        coalesce(is_share, false) = false
        and public.viewer_can_see_owner_moments(auth.uid(), user_id)
        and coalesce(expires_at::timestamptz, created_at + interval '24 hours') > now()
      )
    )
  )
);

-- Story comments SELECT
drop policy if exists "story_comments_select_authenticated" on public.story_comments;
create policy "story_comments_select_visible_or_admin"
on public.story_comments
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (
    coalesce(moderation_status, 'visible') = 'visible'
    and exists (
      select 1
      from public.stories s
      where s.id = story_comments.story_id
        and coalesce(s.moderation_status, 'visible') = 'visible'
        and (
          s.user_id = auth.uid()
          or (
            coalesce(s.is_share, false) = true
            and coalesce(s.share_visible, false) = true
            and coalesce(s.share_hidden, false) = false
          )
          or (
            coalesce(s.is_share, false) = false
            and public.viewer_can_see_owner_moments(auth.uid(), s.user_id)
            and coalesce(s.expires_at::timestamptz, s.created_at + interval '24 hours') > now()
          )
        )
    )
  )
);

-- Admin may update moderation_status on stories/comments
drop policy if exists stories_update_admin_moderation on public.stories;
create policy stories_update_admin_moderation
on public.stories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists story_comments_update_admin_moderation on public.story_comments;
create policy story_comments_update_admin_moderation
on public.story_comments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- story_views: parent story must be visible to viewer
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
      and coalesce(s.moderation_status, 'visible') = 'visible'
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
      and coalesce(s.moderation_status, 'visible') = 'visible'
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
