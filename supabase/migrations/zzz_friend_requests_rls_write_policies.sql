-- friend_requests: allow authenticated users to create/update/delete their own graph edges.
-- The repo historically only shipped SELECT policies (zu_friend_list_visibility_for_friends_of_user.sql).
-- With RLS enabled and no INSERT/UPDATE/DELETE policies, PostgREST rejects all writes — friend
-- requests never persist, notifications never fire, and UI never shows "Request sent".

alter table if exists public.friend_requests enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friend_requests'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.friend_requests', p.policyname);
  end loop;
end $$;

-- Outgoing: only the requester may insert a row, and only as pending (client uses status = pending).
create policy "friend_requests_insert_requester_pending"
on public.friend_requests
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
  and coalesce(status, 'pending') = 'pending'
);

-- Both ends may update status (accept / decline / cancel) on rows they participate in.
create policy "friend_requests_update_participant"
on public.friend_requests
for update
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id)
with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Unfriend + block cleanup delete rows where the viewer is either party.
create policy "friend_requests_delete_participant"
on public.friend_requests
for delete
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);
