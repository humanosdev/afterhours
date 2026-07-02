-- Phase 1 feedback — durable store + optional Resend email from edge function.

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('feature', 'bug', 'general')),
  subject text not null,
  message text not null,
  source text not null default 'native' check (source in ('native', 'web')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_user_id_idx
  on public.feedback_submissions(user_id);

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions(created_at desc);

alter table public.feedback_submissions enable row level security;

drop policy if exists "feedback_submissions_insert_own" on public.feedback_submissions;
create policy "feedback_submissions_insert_own"
  on public.feedback_submissions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No select for regular users; service role / admin tools read later.
