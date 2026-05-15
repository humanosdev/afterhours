-- Owner may UPDATE (e.g. share_hidden) and DELETE their own stories. Client uses these from /moments/:id.
-- Requires RLS already enabled on public.stories (policies are no-ops until then).

drop policy if exists "stories_update_own" on public.stories;
create policy "stories_update_own"
on public.stories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own"
on public.stories
for delete
to authenticated
using (user_id = auth.uid());
