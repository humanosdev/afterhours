-- Allow recipients to delete their own notification rows (in-app dismiss).

drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = recipient_user_id);
