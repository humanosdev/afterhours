-- Blocks table: allow involved users to read rows (blocked-users UI + map filtering).
-- Without SELECT policy, .from('blocks').select() returns empty under RLS.

alter table if exists public.blocks enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'blocks'
  loop
    execute format('drop policy if exists %I on public.blocks', pol.policyname);
  end loop;
end $$;

create policy blocks_select_involved
on public.blocks
for select
to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy blocks_insert_as_blocker
on public.blocks
for insert
to authenticated
with check (blocker_id = auth.uid());

create policy blocks_delete_as_blocker
on public.blocks
for delete
to authenticated
using (blocker_id = auth.uid());
