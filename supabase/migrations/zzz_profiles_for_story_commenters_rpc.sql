-- Comment threads need avatars/usernames for all commenters. RLS on `profiles` can hide
-- rows that are still visible as `user_id` on `story_comments` (authenticated read-all).
-- This SECURITY DEFINER RPC returns display fields for distinct commenters on one story.

create or replace function public.profiles_for_story_commenters(p_story_id uuid)
returns table (id uuid, username text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.username::text, coalesce(p.avatar_url, '')::text as avatar_url
  from public.story_comments c
  join public.profiles p on p.id = c.user_id
  where c.story_id = p_story_id
    and auth.uid() is not null;
$$;

revoke all on function public.profiles_for_story_commenters(uuid) from public;
grant execute on function public.profiles_for_story_commenters(uuid) to authenticated;
