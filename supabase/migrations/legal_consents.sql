create extension if not exists pgcrypto;

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms_privacy')),
  terms_version text not null,
  privacy_version text not null,
  consented_at timestamptz not null default now(),
  ip_address text null,
  user_agent text null
);

create index if not exists legal_consents_user_id_idx
  on public.legal_consents(user_id);

create index if not exists legal_consents_consented_at_idx
  on public.legal_consents(consented_at desc);

create unique index if not exists legal_consents_unique_version_idx
  on public.legal_consents(user_id, consent_type, terms_version, privacy_version);

alter table public.legal_consents enable row level security;

drop policy if exists "legal_consents_select_own" on public.legal_consents;
create policy "legal_consents_select_own"
  on public.legal_consents
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "legal_consents_insert_own" on public.legal_consents;
create policy "legal_consents_insert_own"
  on public.legal_consents
  for insert
  to authenticated
  with check (auth.uid() = user_id);
