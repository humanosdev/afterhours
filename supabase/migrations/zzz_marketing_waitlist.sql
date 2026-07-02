-- Marketing site early-access waitlist (public insert via service-role API route only).

create table if not exists public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  email text not null check (char_length(trim(email)) >= 5),
  phone text,
  city text not null default 'Philadelphia',
  launch_market text not null default 'philadelphia',
  source text not null default 'marketing_site',
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists marketing_waitlist_email_lower_uidx
  on public.marketing_waitlist (lower(trim(email)));

create index if not exists marketing_waitlist_created_at_idx
  on public.marketing_waitlist (created_at desc);

alter table public.marketing_waitlist enable row level security;

-- Rows are written by Next.js `/api/waitlist` using service role; no public read.
revoke all on public.marketing_waitlist from anon, authenticated;
grant select, insert on public.marketing_waitlist to service_role;
