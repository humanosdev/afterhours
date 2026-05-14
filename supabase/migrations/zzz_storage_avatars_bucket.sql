-- Profile avatars: public bucket + RLS so authenticated users can upsert `{user_id}/avatar.jpg`.
-- Without INSERT + UPDATE policies, client uploads fail for every image (generic storage error).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 52428800, null)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = null;

drop policy if exists "avatars_public_read_v1" on storage.objects;
drop policy if exists "avatars_insert_own_v1" on storage.objects;
drop policy if exists "avatars_update_own_v1" on storage.objects;
drop policy if exists "avatars_delete_own_v1" on storage.objects;

create policy "avatars_public_read_v1"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "avatars_insert_own_v1"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "avatars_update_own_v1"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

create policy "avatars_delete_own_v1"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = (select auth.uid())::text
);
