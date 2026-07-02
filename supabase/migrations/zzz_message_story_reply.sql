-- Story replies in DMs: optional story_id on messages + participants may update chat preview.

alter table public.messages
  add column if not exists story_id uuid null references public.stories (id) on delete set null;

create index if not exists messages_story_id_idx
  on public.messages (story_id)
  where story_id is not null;

drop policy if exists "chats update participants" on public.chats;
create policy "chats update participants"
on public.chats
for update
to authenticated
using (auth.uid() = user1_id or auth.uid() = user2_id)
with check (auth.uid() = user1_id or auth.uid() = user2_id);
