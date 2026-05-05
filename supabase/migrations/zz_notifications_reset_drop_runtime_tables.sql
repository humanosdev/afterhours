-- Reset notification runtime for v1 rebuild.
-- Keeps notification_preferences (settings UI) intact.

drop table if exists public.notifications cascade;
drop table if exists public.push_subscriptions cascade;
