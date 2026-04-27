-- Prevent duplicate 1:1 chat pairs regardless of order.
-- NOTE: run this after deduping existing rows if duplicates already exist.

alter table public.chats
  add constraint chats_distinct_users_chk
  check (user1_id <> user2_id);

create unique index if not exists chats_pair_unique_idx
  on public.chats (
    least(user1_id, user2_id),
    greatest(user1_id, user2_id)
  );
