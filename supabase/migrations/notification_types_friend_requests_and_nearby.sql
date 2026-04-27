alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'friend_online',
      'friend_nearby',
      'friend_joined_venue',
      'friends_active_bundle',
      'friend_story',
      'friend_request_received',
      'friend_request_accepted',
      'venue_popping'
    )
  );
